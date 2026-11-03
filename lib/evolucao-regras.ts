// Regras da evolução clínica (servidor e navegador). A mesma regra existe no banco (categoria_evolucao).

export type CategoriaEvolucao = "medica" | "enfermagem";

/** Médico(a) ou enfermeiro(a), pelo cargo do carimbo; técnicos de enfermagem não registram evolução clínica. */
export function categoriaPorCargo(cargo: string | null | undefined): CategoriaEvolucao | null {
  const c = (cargo ?? "").toLowerCase();
  if (!c || c.includes("técnic") || c.includes("tecnic")) return null;
  if (c.includes("médic") || c.includes("medic")) return "medica";
  if (c.includes("enfermeir")) return "enfermagem";
  return null;
}

export const TITULO_CATEGORIA: Record<CategoriaEvolucao, string> = { medica: "Evolução médica", enfermagem: "Evolução de enfermagem" };

export type EvolucaoClinica = {
  id: number; dataHora: string; categoria: CategoriaEvolucao;
  pa: string | null; fc: string | null; fr: string | null; temperatura: string | null; spo2: string | null; glicemia: string | null; dor: number | null;
  evolucao: string; conduta: string | null; autor: string; autorCargo: string | null; autorRegistro: string | null;
};

/** Sinais vitais preenchidos, com unidade, na ordem de leitura. */
export function sinaisVitais(e: Pick<EvolucaoClinica, "pa" | "fc" | "fr" | "temperatura" | "spo2" | "glicemia" | "dor">): [string, string][] {
  const l: [string, string | null, string][] = [
    ["PA", e.pa, "mmHg"], ["FC", e.fc, "bpm"], ["FR", e.fr, "irpm"], ["Temp.", e.temperatura, "°C"],
    ["SpO₂", e.spo2, "%"], ["Glicemia", e.glicemia, "mg/dL"], ["Dor", e.dor === null ? null : String(e.dor), "/10"],
  ];
  return l.filter(([, v]) => v).map(([r, v, u]) => [r, u.startsWith("/") ? `${v}${u}` : `${v} ${u}`]);
}

/** Data e hora no fuso de Fortaleza: "dd/mm/aaaa hh:mm". */
export const dataHoraBR = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short" });
