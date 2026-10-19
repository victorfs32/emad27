import "server-only";
import { cache } from "react";
import { supabaseServidor } from "./supabase/servidor";
import { exigirUsuario } from "./auth";
import {
  MODALIDADES, SEXOS, STATUS, STATUS_ARQUIVADOS, STATUS_PRINCIPAIS, hojeISO,
} from "./opcoes";

export const CAMPOS = [
  "nome", "data_nascimento", "sexo", "cpf", "cns", "telefone",
  "contato_nome", "contato_telefone", "endereco", "bairro", "municipio", "referencia",
  "diagnostico", "cid", "origem", "modalidade", "data_admissao",
  "status", "data_saida", "motivo_saida", "dispositivos", "observacoes",
  "possui_lpp", "proxima_visita",
] as const;

export type Campo = (typeof CAMPOS)[number];
/** Valores do formulário (possui_lpp = "sim" ou ""). */
export type DadosPaciente = Record<Campo, string>;
export type Paciente = Omit<{ [K in Campo]: string | null }, "possui_lpp" | "nome" | "status"> & {
  id: number; nome: string; status: string; possui_lpp: boolean; criado_em: string; atualizado_em: string;
};
export type ItemLista = {
  id: number; nome: string; data_nascimento: string | null; bairro: string | null;
  diagnostico: string | null; modalidade: string | null; telefone: string | null; status: string;
  possui_lpp: boolean; proxima_visita: string | null; ultima_evolucao: string | null;
};
export type Evolucao = { id: number; data: string; tipo: string; texto: string; autor: string };
export type Grupo = "principais" | "arquivados";
export type Filtros = { busca: string; status: string; modalidade: string; lpp: boolean; grupo: Grupo };

const soDigitos = (s: string) => s.replace(/\D/g, "");
const dataValida = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const statusDoGrupo = (g: Grupo): readonly string[] => (g === "arquivados" ? STATUS_ARQUIVADOS : STATUS_PRINCIPAIS);

function ok<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

/** Lê o FormData, normaliza e valida. */
export function lerFormulario(fd: FormData): { dados: DadosPaciente; erro?: string } {
  const dados = {} as DadosPaciente;
  for (const c of CAMPOS) dados[c] = String(fd.get(c) ?? "").trim().slice(0, c === "observacoes" ? 5000 : 500);
  dados.cpf = soDigitos(dados.cpf);
  dados.cns = soDigitos(dados.cns);
  dados.cid = dados.cid.toUpperCase();
  dados.possui_lpp = dados.possui_lpp === "sim" ? "sim" : "";
  if (!dados.status) dados.status = "ativo";

  let erro: string | undefined;
  if (!dados.nome) erro = "Informe o nome do paciente.";
  else if (dados.cpf && dados.cpf.length !== 11) erro = "CPF deve ter 11 dígitos.";
  else if (dados.cns && dados.cns.length !== 15) erro = "Cartão SUS (CNS) deve ter 15 dígitos.";
  else if (!STATUS.some((s) => s.valor === dados.status)) erro = "Situação inválida.";
  else if (dados.modalidade && !(MODALIDADES as readonly string[]).includes(dados.modalidade)) erro = "Modalidade inválida.";
  else if (dados.sexo && !SEXOS.some((s) => s.valor === dados.sexo)) erro = "Sexo inválido.";
  else if (["data_nascimento", "data_admissao", "data_saida", "proxima_visita"].some((c) => dados[c as Campo] && !dataValida(dados[c as Campo])))
    erro = "Há uma data inválida.";
  return { dados, erro };
}

const paraBanco = (d: DadosPaciente) =>
  Object.fromEntries(CAMPOS.map((c) => [c, c === "possui_lpp" ? d.possui_lpp === "sim" : d[c] || null]));

export async function listarPacientes(f: Filtros): Promise<ItemLista[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const grupo = statusDoGrupo(f.grupo);
  let q = sb.from("pacientes_resumo").select("*").in("status", [...grupo]).order("nome");
  if (f.status && grupo.includes(f.status)) q = q.eq("status", f.status);
  if (f.modalidade && (MODALIDADES as readonly string[]).includes(f.modalidade)) q = q.eq("modalidade", f.modalidade);
  if (f.lpp) q = q.eq("possui_lpp", true);
  if (f.busca) {
    // remove caracteres que têm significado na sintaxe do filtro .or()
    const t = f.busca.replace(/[,()%*\\]/g, " ").trim();
    const dig = soDigitos(f.busca);
    const filtros = [`nome.ilike.%${t}%`, `bairro.ilike.%${t}%`, `diagnostico.ilike.%${t}%`];
    if (dig) filtros.push(`cpf.like.%${dig}%`, `cns.like.%${dig}%`);
    if (t) q = q.or(filtros.join(","));
  }
  return ok(await q) as ItemLista[];
}

export async function listarProximasVisitas(): Promise<ItemLista[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  return ok(
    await sb
      .from("pacientes_resumo")
      .select("*")
      .in("status", [...STATUS_PRINCIPAIS])
      .not("proxima_visita", "is", null)
      .order("proxima_visita")
      .order("nome"),
  ) as ItemLista[];
}

export type Resumo = {
  cadastrados: number; acompanhamento: number; visitas7dias: number; lpp: number; arquivados: number;
};

/** Números do painel e do menu lateral. */
export const resumoPainel = cache(async (): Promise<Resumo> => {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const linhas = ok(await sb.from("pacientes").select("status, proxima_visita, possui_lpp")) as {
    status: string; proxima_visita: string | null; possui_lpp: boolean;
  }[];
  const hoje = hojeISO();
  const limite = hojeISO(7);
  const r: Resumo = { cadastrados: 0, acompanhamento: 0, visitas7dias: 0, lpp: 0, arquivados: 0 };
  for (const l of linhas) {
    if ((STATUS_ARQUIVADOS as readonly string[]).includes(l.status)) {
      r.arquivados++;
      continue;
    }
    r.cadastrados++;
    if (l.status === "ativo") r.acompanhamento++;
    if (l.possui_lpp) r.lpp++;
    if (l.proxima_visita && l.proxima_visita >= hoje && l.proxima_visita <= limite) r.visitas7dias++;
  }
  return r;
});

export async function obterPaciente(id: number): Promise<Paciente | null> {
  await exigirUsuario();
  if (!Number.isSafeInteger(id)) return null;
  const sb = await supabaseServidor();
  return ok(await sb.from("pacientes").select("*").eq("id", id).maybeSingle()) as Paciente | null;
}

export async function listarTodosParaExportar(): Promise<Paciente[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  return ok(await sb.from("pacientes").select("*").order("nome")) as Paciente[];
}

export async function listarEvolucoes(pacienteId: number): Promise<Evolucao[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  return ok(
    await sb
      .from("evolucoes")
      .select("id, data, tipo, texto, autor")
      .eq("paciente_id", pacienteId)
      .order("data", { ascending: false })
      .order("id", { ascending: false }),
  ) as Evolucao[];
}

export async function criarPaciente(dados: DadosPaciente): Promise<number> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const criado = ok(await sb.from("pacientes").insert(paraBanco(dados)).select("id").single()) as { id: number };
  return criado.id;
}

export async function atualizarPaciente(id: number, dados: DadosPaciente) {
  await exigirUsuario();
  const sb = await supabaseServidor();
  ok(await sb.from("pacientes").update({ ...paraBanco(dados), atualizado_em: new Date().toISOString() }).eq("id", id));
}

export async function definirProximaVisita(id: number, data: string | null) {
  await exigirUsuario();
  const sb = await supabaseServidor();
  ok(await sb.from("pacientes").update({ proxima_visita: data, atualizado_em: new Date().toISOString() }).eq("id", id));
}

export async function adicionarEvolucao(pacienteId: number, e: { data: string; tipo: string; texto: string }) {
  const u = await exigirUsuario();
  const sb = await supabaseServidor();
  ok(await sb.from("evolucoes").insert({ paciente_id: pacienteId, ...e, autor: u.nome }));
  ok(await sb.from("pacientes").update({ atualizado_em: new Date().toISOString() }).eq("id", pacienteId));
}
