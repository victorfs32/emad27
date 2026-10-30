import "server-only";
// Dados dos indicadores mensais: óbitos, acompanhamento AD1, reinternações, busca ativa e altas.
import { exigirUsuario } from "./auth";
import { supabaseServidor } from "./supabase/servidor";
import { SITUACOES_PRINCIPAIS, limitesDoMes } from "./opcoes";
import { DIAS_REINTERNACAO, sugerirMotivoPermanencia, type DadosClinicosAd1 } from "./indicadores-opcoes";

type Bool = boolean | null;
type Erro = { message: string; code?: string } | null;

/** Erros de coluna/tabela/função que ainda não existem no banco: falta rodar a migração v19. */
const faltaMigracao = (e: Erro) => !!e && ["42703", "42P01", "PGRST204", "PGRST205"].includes(e.code ?? "");

function ok<T>(r: { data: T | null; error: Erro }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);

// ------------------------------------------------------------------ óbitos
export type Obito = {
  id: number; nome: string; prontuario: string; data: string | null; motivo: string | null;
  doPrograma: Bool; justificativa: string | null; numero: string | null;
};

/** Óbitos do mês (pela data da situação) e os óbitos sem data, que não entram em nenhum mês. */
export async function listarObitos(mes: string): Promise<{ doMes: Obito[]; semData: Obito[]; faltaMigracao: boolean }> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const { inicio, fim } = limitesDoMes(mes);
  type Linha = {
    id: number; nome: string; prontuario: string; situacao_data: string | null; situacao_motivo: string | null;
    obito_do_programa?: Bool; obito_do_justificativa?: string | null; obito_do_numero?: string | null;
  };
  const consulta = (colunas: string) =>
    sb.from("pacientes").select(colunas).eq("situacao", "obito").order("situacao_data", { nullsFirst: false }).order("nome");
  let r = await consulta("id, nome, prontuario, situacao_data, situacao_motivo, obito_do_programa, obito_do_justificativa, obito_do_numero");
  const falta = faltaMigracao(r.error);
  if (falta) r = await consulta("id, nome, prontuario, situacao_data, situacao_motivo");
  const linhas = (ok(r) as unknown as Linha[]).map((l): Obito => ({
    id: l.id, nome: l.nome, prontuario: l.prontuario, data: l.situacao_data, motivo: l.situacao_motivo,
    doPrograma: l.obito_do_programa ?? null, justificativa: l.obito_do_justificativa ?? null, numero: l.obito_do_numero ?? null,
  }));
  return {
    doMes: linhas.filter((l) => l.data !== null && l.data >= inicio && l.data < fim),
    semData: linhas.filter((l) => l.data === null),
    faltaMigracao: falta,
  };
}

// ------------------------------------------------------------------ acompanhamento AD1
export type PacienteAd1 = { id: number; nome: string; prontuario: string; motivo: string | null; sugestao: string };

/** Pacientes AD1 em acompanhamento (ativos e internados), com o motivo de permanência e uma sugestão tirada do cadastro. */
export async function listarAd1(): Promise<{ lista: PacienteAd1[]; faltaMigracao: boolean }> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const base = "id, nome, prontuario, tqt, dieta_vias, diurese, colostomia, lpp, o2, usa_cama_pmec, dispositivos(tipo)";
  const consulta = (colunas: string) =>
    sb.from("pacientes").select(colunas).in("situacao", [...SITUACOES_PRINCIPAIS]).eq("modalidade", "AD1").order("nome");
  let r = await consulta(`${base}, usa_aspirador_pmec, motivo_permanencia`);
  const falta = faltaMigracao(r.error);
  if (falta) r = await consulta(base);
  type Linha = DadosClinicosAd1 & { id: number; nome: string; prontuario: string; motivo_permanencia?: string | null };
  return {
    lista: (ok(r) as unknown as Linha[]).map((l) => ({
      id: l.id, nome: l.nome, prontuario: l.prontuario, motivo: l.motivo_permanencia ?? null,
      sugestao: sugerirMotivoPermanencia({ ...l, dieta_vias: l.dieta_vias ?? [], dispositivos: l.dispositivos ?? [] }),
    })),
    faltaMigracao: falta,
  };
}

// ------------------------------------------------------------------ reinternações
export type Reinternacao = {
  id: number; pacienteId: number; nome: string; prontuario: string;
  /** Admissão no programa (desospitalização) mais recente até a data da reinternação. */
  admissao: string | null; data: string; motivo: string | null; dias: number | null; conta: boolean;
};

/** Reinternações registradas no mês; contam no indicador as que aconteceram até 30 dias após a admissão. */
export async function listarReinternacoes(mes: string): Promise<{ lista: Reinternacao[]; faltaMigracao: boolean }> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const { inicio, fim } = limitesDoMes(mes);
  const r = await sb.from("reinternacoes")
    .select("id, data, motivo, paciente:pacientes(id, nome, prontuario, admissao, admissoes(admissao))")
    .gte("data", inicio).lt("data", fim).order("data").order("id");
  if (faltaMigracao(r.error)) return { lista: [], faltaMigracao: true };
  type Linha = {
    id: number; data: string; motivo: string | null;
    paciente: { id: number; nome: string; prontuario: string; admissao: string | null; admissoes: { admissao: string | null }[] } | null;
  };
  const lista = (ok(r) as unknown as Linha[]).filter((l) => l.paciente).map((l): Reinternacao => {
    const p = l.paciente!;
    const admissoes = [p.admissao, ...(p.admissoes ?? []).map((a) => a.admissao)].filter((d): d is string => !!d && d <= l.data).sort();
    const admissao = admissoes.length ? admissoes[admissoes.length - 1] : null;
    const dias = admissao ? diasEntre(admissao, l.data) : null;
    return {
      id: l.id, pacienteId: p.id, nome: p.nome, prontuario: p.prontuario, admissao, data: l.data, motivo: l.motivo,
      dias, conta: dias !== null && dias <= DIAS_REINTERNACAO,
    };
  });
  return { lista, faltaMigracao: false };
}

// ------------------------------------------------------------------ busca ativa
export type BuscaAtiva = { id: number; data: string; paciente: string; situacao: "elegivel" | "inelegivel"; autor: string };

export async function listarBuscaAtiva(mes: string): Promise<{ lista: BuscaAtiva[]; faltaMigracao: boolean }> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const { inicio, fim } = limitesDoMes(mes);
  const r = await sb.from("busca_ativa").select("id, data, paciente, situacao, autor").gte("data", inicio).lt("data", fim).order("data").order("id");
  if (faltaMigracao(r.error)) return { lista: [], faltaMigracao: true };
  return { lista: ok(r) as BuscaAtiva[], faltaMigracao: false };
}

// ------------------------------------------------------------------ altas
export type Alta = {
  id: number; nome: string; prontuario: string; situacao: "alta" | "transferido" | "obito"; data: string;
  motivo: string | null; tipo: string | null;
};

/** Saídas do programa no mês (alta, transferência e óbito), pela data da situação. */
export async function listarAltas(mes: string): Promise<{ lista: Alta[]; faltaMigracao: boolean }> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const { inicio, fim } = limitesDoMes(mes);
  const consulta = (colunas: string) =>
    sb.from("pacientes").select(colunas).in("situacao", ["alta", "transferido", "obito"])
      .gte("situacao_data", inicio).lt("situacao_data", fim).order("situacao_data").order("nome");
  let r = await consulta("id, nome, prontuario, situacao, situacao_data, situacao_motivo, alta_tipo");
  const falta = faltaMigracao(r.error);
  if (falta) r = await consulta("id, nome, prontuario, situacao, situacao_data, situacao_motivo");
  type Linha = { id: number; nome: string; prontuario: string; situacao: Alta["situacao"]; situacao_data: string; situacao_motivo: string | null; alta_tipo?: string | null };
  return {
    lista: (ok(r) as unknown as Linha[]).map((l) => ({
      id: l.id, nome: l.nome, prontuario: l.prontuario, situacao: l.situacao, data: l.situacao_data,
      motivo: l.situacao_motivo, tipo: l.alta_tipo ?? null,
    })),
    faltaMigracao: falta,
  };
}
