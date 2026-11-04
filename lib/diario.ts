import "server-only";
// Diário de atendimentos: dia (equipe e anotações) e atendimentos de manhã e de tarde.
import { exigirUsuario } from "./auth";
import { supabaseServidor } from "./supabase/servidor";
import { limitesDoMes } from "./opcoes";
import type { Atendimento, DiaDiario, Equipe } from "./diario-opcoes";

type Erro = { message: string; code?: string } | null;
const falta = (e: Erro) => !!e && ["42P01", "PGRST205"].includes(e.code ?? "");

type LinhaAtend = {
  id: number; data: string; turno: Atendimento["turno"]; paciente_id: number | null; paciente_nome: string;
  pa: string | null; fc: string | null; fr: string | null; ta: string | null; dx: string | null; spo2: string | null;
  profissionais: string[] | null; procedimentos: string[] | null; autor: string;
};
const COLUNAS = "id, data, turno, paciente_id, paciente_nome, pa, fc, fr, ta, dx, spo2, profissionais, procedimentos, autor";
const paraAtendimento = (l: LinhaAtend): Atendimento => ({
  id: l.id, data: l.data, turno: l.turno, pacienteId: l.paciente_id, paciente: l.paciente_nome,
  pa: l.pa, fc: l.fc, fr: l.fr, ta: l.ta, dx: l.dx, spo2: l.spo2,
  profissionais: l.profissionais ?? [], procedimentos: l.procedimentos ?? [], autor: l.autor,
});
const paraDia = (l: { data: string; equipe: unknown; anotacoes: string | null }): DiaDiario => ({
  data: l.data, equipe: { manha: {}, tarde: {}, ...((l.equipe ?? {}) as Partial<Equipe>) }, anotacoes: l.anotacoes ?? "",
});

/** Um dia do diário (pode ainda não existir: volta null) e os atendimentos dele. */
export async function obterDiario(data: string): Promise<{ dia: DiaDiario | null; atendimentos: Atendimento[]; faltaMigracao: boolean }> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const [d, a] = await Promise.all([
    sb.from("diario_dias").select("data, equipe, anotacoes").eq("data", data).maybeSingle(),
    sb.from("diario_atendimentos").select(COLUNAS).eq("data", data).order("turno").order("id"),
  ]);
  if (falta(d.error) || falta(a.error)) return { dia: null, atendimentos: [], faltaMigracao: true };
  if (d.error) throw new Error(d.error.message);
  if (a.error) throw new Error(a.error.message);
  return { dia: d.data ? paraDia(d.data) : null, atendimentos: (a.data as LinhaAtend[]).map(paraAtendimento), faltaMigracao: false };
}

/** Todos os dias e atendimentos de um mês (para o PDF do mês). */
export async function obterDiarioDoMes(mes: string): Promise<{ dias: DiaDiario[]; atendimentos: Atendimento[] }> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const { inicio, fim } = limitesDoMes(mes);
  const [d, a] = await Promise.all([
    sb.from("diario_dias").select("data, equipe, anotacoes").gte("data", inicio).lt("data", fim).order("data"),
    sb.from("diario_atendimentos").select(COLUNAS).gte("data", inicio).lt("data", fim).order("data").order("turno").order("id"),
  ]);
  if (d.error) throw new Error(d.error.message);
  if (a.error) throw new Error(a.error.message);
  return {
    dias: (d.data as { data: string; equipe: unknown; anotacoes: string | null }[]).map(paraDia),
    atendimentos: (a.data as LinhaAtend[]).map(paraAtendimento),
  };
}
