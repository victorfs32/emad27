// Tipos e constantes da prescrição digitada (usados no navegador e no servidor).

export const COLUNAS_APRAZAMENTO = 5;
export const MAX_ITENS_PRESCRICAO = 40;

export type ItemPrescricao = {
  /** Data do item (yyyy-mm-dd). */
  data: string;
  /** Prescrição escrita (medicamento, dose, via, frequência, cuidados…). */
  texto: string;
  /** Uma anotação por coluna do APRAZAMENTO (horários, visto etc.). Sempre com 5 posições. */
  aprazamento: string[];
};

export type DadosFormPrescricao = {
  data: string;
  /** Datas das 5 colunas do APRAZAMENTO (yyyy-mm-dd ou vazio para preencher à mão). */
  datas_aprazamento: string[];
  itens: ItemPrescricao[];
  observacoes: string;
};

export type PrescricaoSalva = {
  id: number;
  data: string;
  datas_aprazamento: string[];
  itens: ItemPrescricao[];
  observacoes: string | null;
  autor: string;
  usuario_id: string | null;
  criado_em: string;
  atualizado_em: string;
};

export const itemVazio = (data: string): ItemPrescricao => ({
  data,
  texto: "",
  aprazamento: Array.from({ length: COLUNAS_APRAZAMENTO }, () => ""),
});

export const formularioPrescricaoVazio = (hoje: string): DadosFormPrescricao => ({
  data: hoje,
  datas_aprazamento: Array.from({ length: COLUNAS_APRAZAMENTO }, () => ""),
  itens: [itemVazio(hoje)],
  observacoes: "",
});

/** Garante 5 posições (completa com vazio). */
export const completarAprazamento = (a: unknown): string[] => {
  const base = Array.isArray(a) ? a.map((x) => (typeof x === "string" ? x : "")) : [];
  return Array.from({ length: COLUNAS_APRAZAMENTO }, (_, i) => base[i] ?? "");
};
