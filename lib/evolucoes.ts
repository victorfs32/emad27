import "server-only";
// Evoluções clínicas (médica e de enfermagem) de um paciente.
import { exigirUsuario } from "./auth";
import { supabaseServidor } from "./supabase/servidor";
import type { EvolucaoClinica } from "./evolucao-regras";

export type PacienteEvolucao = {
  id: number; nome: string; prontuario: string; cns: string | null; data_nascimento: string | null; sexo: string | null;
  situacao: string; bairro: string | null; diagnosticos: { cid: string; descricao: string | null; principal: boolean }[];
};

export async function pacienteParaEvolucao(id: number): Promise<PacienteEvolucao | null> {
  await exigirUsuario();
  if (!Number.isSafeInteger(id)) return null;
  const sb = await supabaseServidor();
  const r = await sb.from("pacientes")
    .select("id, nome, prontuario, cns, data_nascimento, sexo, situacao, bairro, diagnosticos(cid, descricao, principal)")
    .eq("id", id).maybeSingle();
  if (r.error) throw new Error(r.error.message);
  return r.data as PacienteEvolucao | null;
}

/** Evoluções do paciente, da mais recente para a mais antiga. Sem a migração v20, devolve vazio e avisa. */
export async function listarEvolucoesClinicas(pacienteId: number): Promise<{ lista: EvolucaoClinica[]; faltaMigracao: boolean }> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const r = await sb.from("evolucoes_clinicas")
    .select("id, data_hora, categoria, pa, fc, fr, temperatura, spo2, glicemia, dor, evolucao, conduta, autor, autor_cargo, autor_registro")
    .eq("paciente_id", pacienteId).order("data_hora", { ascending: false }).order("id", { ascending: false });
  if (r.error && ["42P01", "PGRST205"].includes(r.error.code ?? "")) return { lista: [], faltaMigracao: true };
  if (r.error) throw new Error(r.error.message);
  type Linha = Omit<EvolucaoClinica, "dataHora" | "autorCargo" | "autorRegistro"> & { data_hora: string; autor_cargo: string | null; autor_registro: string | null };
  return {
    lista: (r.data as Linha[]).map(({ data_hora, autor_cargo, autor_registro, ...e }) => ({ ...e, dataHora: data_hora, autorCargo: autor_cargo, autorRegistro: autor_registro })),
    faltaMigracao: false,
  };
}
