import "server-only";
import { supabaseServidor } from "./supabase/servidor";
import { exigirUsuario } from "./auth";
import {
  COLUNAS_APRAZAMENTO, MAX_ITENS_PRESCRICAO, completarAprazamento,
  type DadosFormPrescricao, type ItemPrescricao, type PrescricaoSalva,
} from "./prescricao-tipos";

const dataOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

type Linha = {
  id: number; data: string; datas_aprazamento: unknown; itens: unknown; observacoes: string | null;
  autor: string; usuario_id: string | null; criado_em: string; atualizado_em: string;
};

function paraPrescricao(l: Linha): PrescricaoSalva {
  const itens = (Array.isArray(l.itens) ? l.itens : []) as Partial<ItemPrescricao>[];
  return {
    id: l.id,
    data: l.data,
    datas_aprazamento: completarAprazamento(l.datas_aprazamento),
    itens: itens.map((i) => ({ data: i.data ?? "", texto: i.texto ?? "", aprazamento: completarAprazamento(i.aprazamento) })),
    observacoes: l.observacoes,
    autor: l.autor,
    usuario_id: l.usuario_id,
    criado_em: l.criado_em,
    atualizado_em: l.atualizado_em,
  };
}

const COLUNAS = "id, data, datas_aprazamento, itens, observacoes, autor, usuario_id, criado_em, atualizado_em";

export async function listarPrescricoes(pacienteId: number): Promise<PrescricaoSalva[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const r = await sb.from("prescricoes").select(COLUNAS).eq("paciente_id", pacienteId)
    .order("data", { ascending: false }).order("id", { ascending: false });
  if (r.error) throw new Error(r.error.message);
  return (r.data as Linha[]).map(paraPrescricao);
}

export async function obterPrescricao(id: number): Promise<(PrescricaoSalva & { paciente_id: number }) | null> {
  await exigirUsuario();
  if (!Number.isSafeInteger(id)) return null;
  const sb = await supabaseServidor();
  const r = await sb.from("prescricoes").select(`${COLUNAS}, paciente_id`).eq("id", id).maybeSingle();
  if (r.error) throw new Error(r.error.message);
  if (!r.data) return null;
  const linha = r.data as unknown as Linha & { paciente_id: number };
  return { ...paraPrescricao(linha), paciente_id: linha.paciente_id };
}

/** Valida e limpa o que veio do formulário. Itens totalmente vazios são descartados. */
export function normalizarPrescricao(d: DadosFormPrescricao):
  | { erro: string }
  | { payload: { data: string; datas_aprazamento: string[]; itens: ItemPrescricao[]; observacoes: string } } {
  if (!dataOk(d.data)) return { erro: "Informe a data da prescrição." };

  const itens: ItemPrescricao[] = [];
  for (const [i, it] of d.itens.entries()) {
    const texto = it.texto.trim().slice(0, 2000);
    const aprazamento = completarAprazamento(it.aprazamento).map((a) => a.trim().slice(0, 60));
    const data = (it.data ?? "").trim();
    if (!texto && !aprazamento.some(Boolean)) continue;
    if (!texto) return { erro: `O item ${i + 1} tem aprazamento, mas está sem a prescrição escrita.` };
    if (data && !dataOk(data)) return { erro: `A data do item ${i + 1} é inválida.` };
    itens.push({ data, texto, aprazamento });
  }
  if (itens.length === 0) return { erro: "Escreva ao menos um item da prescrição." };
  if (itens.length > MAX_ITENS_PRESCRICAO) return { erro: `No máximo ${MAX_ITENS_PRESCRICAO} itens por prescrição.` };

  const datas = Array.from({ length: COLUNAS_APRAZAMENTO }, (_, k) => (d.datas_aprazamento?.[k] ?? "").trim());
  for (const x of datas) if (x && !dataOk(x)) return { erro: "Há data inválida no cabeçalho do aprazamento." };

  return { payload: { data: d.data, datas_aprazamento: datas, itens, observacoes: d.observacoes.trim().slice(0, 2000) } };
}

export async function gravarPrescricao(
  id: number | null, pacienteId: number, d: DadosFormPrescricao,
): Promise<{ erro?: string }> {
  const u = await exigirUsuario();
  if (!u.perms.prescrever) return { erro: "Você não tem permissão para prescrever." };
  const n = normalizarPrescricao(d);
  if ("erro" in n) return { erro: n.erro };

  const sb = await supabaseServidor();
  const r = await sb.rpc("salvar_prescricao", { p_id: id, p_paciente: pacienteId, p: n.payload });
  if (r.error) {
    console.error("[gravarPrescricao]", r.error.code ?? r.error.message);
    if (r.error.code === "42501") return { erro: r.error.message };
    return { erro: "Não foi possível salvar a prescrição. Tente novamente; se continuar, avise a coordenação." };
  }
  return {};
}

export async function removerPrescricaoDb(id: number): Promise<{ erro?: string }> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const r = await sb.rpc("remover_prescricao", { p_id: id });
  if (r.error) {
    console.error("[removerPrescricao]", r.error.code ?? r.error.message);
    return { erro: r.error.code === "42501" ? r.error.message : "Não foi possível remover a prescrição." };
  }
  return {};
}

export type PrescricaoComPaciente = PrescricaoSalva & { paciente_id: number; paciente: string; prontuario: string };

/** Últimas prescrições de todos os pacientes (tela Prescrições). */
export async function listarPrescricoesRecentes(limite = 30): Promise<PrescricaoComPaciente[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const r = await sb.from("prescricoes").select(`${COLUNAS}, paciente_id, pacientes(nome, prontuario)`)
    .order("data", { ascending: false }).order("id", { ascending: false }).limit(limite);
  if (r.error) throw new Error(r.error.message);
  return (r.data as unknown as (Linha & { paciente_id: number; pacientes: { nome: string; prontuario: string } | null })[]).map((l) => ({
    ...paraPrescricao(l),
    paciente_id: l.paciente_id,
    paciente: l.pacientes?.nome ?? "",
    prontuario: l.pacientes?.prontuario ?? "",
  }));
}
