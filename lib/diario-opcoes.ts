// Opções do diário de atendimentos (servidor e navegador), iguais à folha "Ocorrência - EMAD".

export const TURNOS = [{ valor: "manha", rotulo: "Manhã" }, { valor: "tarde", rotulo: "Tarde" }] as const;
export type Turno = (typeof TURNOS)[number]["valor"];

/** Linhas da equipe do dia (por turno). */
export const FUNCOES_EQUIPE = [
  { valor: "medico", rotulo: "Médico" },
  { valor: "enfermeiro", rotulo: "Enfermeiro" },
  { valor: "fisioterapeuta", rotulo: "Fisioterapeuta" },
  { valor: "tecnico1", rotulo: "Técnico 1" },
  { valor: "tecnico2", rotulo: "Técnico 2" },
  { valor: "folga", rotulo: "Folga/BH" },
  { valor: "atestado", rotulo: "Atestado/Férias" },
  { valor: "falta", rotulo: "Falta" },
] as const;
export type Equipe = Record<Turno, Partial<Record<(typeof FUNCOES_EQUIPE)[number]["valor"], string>>>;

/** Profissionais presentes no atendimento: M (médico), F (fisio), E (enfermeiro), TE (técnico). */
export const PROFISSIONAIS = [
  { valor: "M", rotulo: "Médico" },
  { valor: "F", rotulo: "Fisioterapeuta" },
  { valor: "E", rotulo: "Enfermeiro" },
  { valor: "TE", rotulo: "Técnico de enfermagem" },
] as const;

/** Sinais vitais da folha (TA = temperatura axilar; DX = dextro / glicemia capilar). */
export const SINAIS = [
  { valor: "pa", rotulo: "PA", ph: "120x80" },
  { valor: "fc", rotulo: "FC", ph: "80" },
  { valor: "fr", rotulo: "FR", ph: "18" },
  { valor: "ta", rotulo: "TA", ph: "36,5" },
  { valor: "dx", rotulo: "DX", ph: "110" },
  { valor: "spo2", rotulo: "SpO2", ph: "96" },
] as const;
export type Sinal = (typeof SINAIS)[number]["valor"];

/** Procedimentos da folha, na mesma ordem. */
export const PROCEDIMENTOS_DIARIO = [
  { valor: "solicitacao_samu", rotulo: "Solicitações SAMU" },
  { valor: "remocao_samu", rotulo: "Remoções efetivas SAMU" },
  { valor: "ambulancia_pmc", rotulo: "Remoção ambulância do PMC" },
  { valor: "troca_gtt", rotulo: "Troca de GTT" },
  { valor: "troca_sne", rotulo: "Troca de SNE" },
  { valor: "troca_sng", rotulo: "Troca de SNG" },
  { valor: "troca_cistostomia", rotulo: "Troca de Cistostomia" },
  { valor: "svd", rotulo: "Passagem/Troca de SVD" },
  { valor: "cateterismo_alivio", rotulo: "Cateterismo de Alívio" },
  { valor: "troca_colostomia", rotulo: "Troca de Colostomia" },
  { valor: "retirada_pontos", rotulo: "Retirada de Pontos" },
  { valor: "clister", rotulo: "Clister/Enema" },
  { valor: "antibiotico", rotulo: "Aplicações de Antibióticos" },
  { valor: "injetaveis", rotulo: "Aplicação de injetáveis em geral" },
  { valor: "coletas", rotulo: "Coletas" },
  { valor: "exames_coleta", rotulo: "Exames por coleta" },
  { valor: "sinais_vitais", rotulo: "Sinais Vitais" },
  { valor: "glicemia", rotulo: "Glicemia Capilar" },
  { valor: "curativos", rotulo: "Curativos" },
  { valor: "aspiracao", rotulo: "Aspirações de Vias Aéreas" },
  { valor: "desospitalizacao", rotulo: "Visita desospitalização" },
  { valor: "pacientes_uaps", rotulo: "Visita pacientes UAPS" },
  { valor: "outros_emad", rotulo: "Pacientes outros EMAD" },
  { valor: "pos_obito", rotulo: "Visita Pós-óbito" },
  { valor: "inicio_atb", rotulo: "Iniciou ATB" },
] as const;

export type Atendimento = {
  id: number; data: string; turno: Turno; pacienteId: number | null; paciente: string;
  pa: string | null; fc: string | null; fr: string | null; ta: string | null; dx: string | null; spo2: string | null;
  profissionais: string[]; procedimentos: string[]; autor: string;
};
export type DiaDiario = { data: string; equipe: Equipe; anotacoes: string };

/** Totais de um conjunto de atendimentos: quantos, por profissional e por procedimento. */
export function totais(lista: Pick<Atendimento, "profissionais" | "procedimentos">[]) {
  const prof = Object.fromEntries(PROFISSIONAIS.map((p) => [p.valor, lista.filter((a) => a.profissionais.includes(p.valor)).length]));
  const proc = Object.fromEntries(PROCEDIMENTOS_DIARIO.map((p) => [p.valor, lista.filter((a) => a.procedimentos.includes(p.valor)).length]));
  return { atendimentos: lista.length, prof, proc };
}
