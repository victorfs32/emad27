import "server-only";
import { supabaseServidor } from "./supabase/servidor";
import { exigirUsuario } from "./auth";
import { MODALIDADES, SEXOS, STATUS } from "./opcoes";

export const CAMPOS = [
  "nome", "data_nascimento", "sexo", "cpf", "cns", "telefone",
  "contato_nome", "contato_telefone", "endereco", "bairro", "municipio", "referencia",
  "diagnostico", "cid", "origem", "modalidade", "data_admissao",
  "status", "data_saida", "motivo_saida", "dispositivos", "observacoes",
] as const;

export type Campo = (typeof CAMPOS)[number];
export type DadosPaciente = Record<Campo, string>;
export type Paciente = { [K in Campo]: string | null } & {
  id: number; nome: string; status: string; criado_em: string; atualizado_em: string;
};
export type ItemLista = Pick<
  Paciente,
  "id" | "nome" | "data_nascimento" | "bairro" | "diagnostico" | "modalidade" | "telefone"
> & { status: string; ultima_evolucao: string | null };
export type Evolucao = { id: number; data: string; tipo: string; texto: string; autor: string };

const soDigitos = (s: string) => s.replace(/\D/g, "");
const dataValida = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

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
  if (!dados.status) dados.status = "ativo";

  let erro: string | undefined;
  if (!dados.nome) erro = "Informe o nome do paciente.";
  else if (dados.cpf && dados.cpf.length !== 11) erro = "CPF deve ter 11 dígitos.";
  else if (dados.cns && dados.cns.length !== 15) erro = "Cartão SUS (CNS) deve ter 15 dígitos.";
  else if (!STATUS.some((s) => s.valor === dados.status)) erro = "Situação inválida.";
  else if (dados.modalidade && !(MODALIDADES as readonly string[]).includes(dados.modalidade)) erro = "Modalidade inválida.";
  else if (dados.sexo && !SEXOS.some((s) => s.valor === dados.sexo)) erro = "Sexo inválido.";
  else if (["data_nascimento", "data_admissao", "data_saida"].some((c) => dados[c as Campo] && !dataValida(dados[c as Campo])))
    erro = "Há uma data inválida.";
  return { dados, erro };
}

const paraBanco = (d: DadosPaciente) => Object.fromEntries(CAMPOS.map((c) => [c, d[c] || null]));

export async function listarPacientes(busca: string, status: string): Promise<ItemLista[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  let q = sb.from("pacientes_resumo").select("*").order("nome");
  if (status) q = q.eq("status", status);
  if (busca) {
    // remove caracteres que têm significado na sintaxe do filtro .or()
    const t = busca.replace(/[,()%*\\]/g, " ").trim();
    const dig = soDigitos(busca);
    const filtros = [`nome.ilike.%${t}%`, `bairro.ilike.%${t}%`, `diagnostico.ilike.%${t}%`];
    if (dig) filtros.push(`cpf.like.%${dig}%`, `cns.like.%${dig}%`);
    if (t) q = q.or(filtros.join(","));
  }
  return ok(await q) as ItemLista[];
}

export async function contarPorStatus(): Promise<Record<string, number>> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const linhas = ok(await sb.from("pacientes").select("status")) as { status: string }[];
  const mapa: Record<string, number> = {};
  for (const l of linhas) mapa[l.status] = (mapa[l.status] ?? 0) + 1;
  return mapa;
}

export async function obterPaciente(id: number): Promise<Paciente | null> {
  await exigirUsuario();
  if (!Number.isSafeInteger(id)) return null;
  const sb = await supabaseServidor();
  return ok(await sb.from("pacientes").select("*").eq("id", id).maybeSingle()) as Paciente | null;
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

export async function adicionarEvolucao(pacienteId: number, e: { data: string; tipo: string; texto: string }) {
  const u = await exigirUsuario();
  const sb = await supabaseServidor();
  ok(await sb.from("evolucoes").insert({ paciente_id: pacienteId, ...e, autor: u.nome }));
  ok(await sb.from("pacientes").update({ atualizado_em: new Date().toISOString() }).eq("id", pacienteId));
}
