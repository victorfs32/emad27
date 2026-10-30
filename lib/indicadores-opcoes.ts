// Opções e regras dos indicadores mensais (servidor e navegador).

/** Tipos de alta da planilha de indicadores (óbito entra automaticamente pela situação). */
export const TIPOS_ALTA = [
  { valor: "administrativa", rotulo: "Alta Administrativa" },
  { valor: "atencao_basica", rotulo: "Encaminhamento para Atenção Básica (AD1)" },
  { valor: "internacao", rotulo: "Internação Hospitalar" },
  { valor: "urgencia", rotulo: "Encaminhamento ao Serviço de Urgência e Emergência" },
] as const;
export const ROTULO_OBITO = "Óbito";

export const rotuloTipoAlta = (v: string | null | undefined) => TIPOS_ALTA.find((t) => t.valor === v)?.rotulo ?? null;

/** Exemplos de motivo de permanência do paciente AD1 no programa (da planilha). */
export const EXEMPLOS_PERMANENCIA = [
  "Uso de dispositivo: SVD, SVA, cistostomia, GTT, TQT…",
  "Judicializado",
  "Uso de cama hospitalar ou oxigênio do Programa",
  "Lesão por pressão",
  "Paciente paliativo",
  "Reabilitação",
  "Aguardando angioplastia",
];

/** Reinternação conta no indicador quando acontece até 30 dias depois da admissão (desospitalização). */
export const DIAS_REINTERNACAO = 30;

export type DadosClinicosAd1 = {
  tqt: boolean | null; dieta_vias: string[]; diurese: string | null; colostomia: boolean | null; lpp: boolean | null;
  o2: boolean | null; usa_cama_pmec: boolean | null; usa_aspirador_pmec?: boolean | null; dispositivos: { tipo: string }[];
};

/** Sugere o motivo de permanência a partir do cadastro (dispositivos, lesão, cama/oxigênio do Programa). */
export function sugerirMotivoPermanencia(p: DadosClinicosAd1): string {
  const disp = new Set<string>();
  if (p.diurese === "svd" || p.dispositivos.some((d) => d.tipo === "svd")) disp.add("SVD");
  if (p.diurese === "cistostomia") disp.add("Cistostomia");
  if (p.dieta_vias.includes("gastrostomia") || p.dispositivos.some((d) => d.tipo === "gtt")) disp.add("GTT");
  if (p.dieta_vias.includes("sng") || p.dispositivos.some((d) => d.tipo === "sng")) disp.add("SNG");
  if (p.dieta_vias.includes("sne")) disp.add("SNE");
  if (p.tqt) disp.add("TQT");
  if (p.colostomia) disp.add("Colostomia");

  const motivos: string[] = [];
  if (disp.size) motivos.push(`Uso de dispositivo: ${[...disp].join(", ")}`);
  if (p.lpp) motivos.push("Lesão por pressão");
  const programa = [p.usa_cama_pmec ? "cama hospitalar" : "", p.o2 ? "oxigênio" : "", p.usa_aspirador_pmec ? "aspirador" : ""].filter(Boolean);
  if (programa.length) motivos.push(`Uso de ${programa.join(", ").replace(/, ([^,]*)$/, " e $1")} do Programa`);
  return motivos.join("; ");
}
