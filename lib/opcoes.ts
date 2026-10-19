export const SITUACOES = [
  { valor: "ativo", rotulo: "Ativo" },
  { valor: "internado", rotulo: "Internado temporariamente" },
  { valor: "alta", rotulo: "Alta" },
  { valor: "transferido", rotulo: "Transferido" },
  { valor: "obito", rotulo: "Óbito" },
] as const;

/** Lista padrão x arquivados (permanecem no histórico, fora da lista padrão). */
export const SITUACOES_PRINCIPAIS = ["ativo", "internado"] as const;
export const SITUACOES_ARQUIVADAS = ["alta", "transferido", "obito"] as const;

export const MODALIDADES = ["AD1", "AD2", "AD3"] as const;

export const DE_QUEM = [
  { valor: "paciente", rotulo: "Paciente" },
  { valor: "cuidador", rotulo: "Cuidador" },
  { valor: "familiar", rotulo: "Familiar" },
] as const;

export const FISIO = [
  { valor: "sim", rotulo: "Sim" },
  { valor: "nao", rotulo: "Não" },
  { valor: "aguardando", rotulo: "Aguardando avaliação" },
] as const;

export const VIAS_DIETA = [
  { valor: "oral", rotulo: "Oral" },
  { valor: "sng", rotulo: "Sonda nasogástrica" },
  { valor: "sne", rotulo: "Sonda nasoenteral" },
  { valor: "gastrostomia", rotulo: "Gastrostomia" },
  { valor: "outra", rotulo: "Outra" },
] as const;
export const VIAS_SONDA = ["sng", "sne", "gastrostomia"] as const;

export const DIURESE = [
  { valor: "espontanea", rotulo: "Espontânea" },
  { valor: "svd", rotulo: "Sonda vesical de demora" },
  { valor: "cistostomia", rotulo: "Cistostomia" },
  { valor: "outra", rotulo: "Outra" },
] as const;

export const CONTINENCIA = [
  { valor: "continente", rotulo: "Continente" },
  { valor: "parcial", rotulo: "Parcialmente continente" },
  { valor: "incontinente", rotulo: "Incontinente" },
] as const;

export const TIPOS_EVOLUCAO = [
  "Visita domiciliar",
  "Contato telefônico",
  "Intercorrência",
  "Avaliação inicial",
  "Procedimento",
  "Outro",
] as const;

export function rotulo<T extends readonly { valor: string; rotulo: string }[]>(lista: T, valor: string | null | undefined) {
  return lista.find((i) => i.valor === valor)?.rotulo;
}

/** Informação ausente (null) é diferente de resposta negativa (false). */
export function simNao(v: boolean | null | undefined) {
  return v === true ? "Sim" : v === false ? "Não" : "Não informado";
}

export function valorOuNI(v: string | number | null | undefined) {
  return v === null || v === undefined || v === "" ? "Não informado" : String(v);
}

export function formatarData(iso: string | null | undefined) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : "—";
}

export function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Data de hoje (yyyy-mm-dd) no fuso de Brasília; o servidor da Vercel roda em UTC. */
export function hojeISO(deslocamentoDias = 0) {
  const agora = new Date(Date.now() + deslocamentoDias * 86400000);
  return agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

/** Idade em anos, sempre calculada a partir da data de nascimento. */
export function calcularIdade(nascimento: string | null | undefined) {
  if (!nascimento) return null;
  const [a, m, d] = nascimento.split("-").map(Number);
  if (!a || !m || !d) return null;
  const [ha, hm, hd] = hojeISO().split("-").map(Number);
  let idade = ha - a;
  if (hm < m || (hm === m && hd < d)) idade--;
  return idade >= 0 ? idade : null;
}

// ---- Dispositivos trocáveis (planilha DEVICES)
export const TIPOS_DISPOSITIVO = [
  { valor: "gtt", rotulo: "Gastrostomia (GTT)", sigla: "GTT", meses: 6 },
  { valor: "sng", rotulo: "Sonda nasogástrica (SNG)", sigla: "SNG", meses: 3 },
  { valor: "sne", rotulo: "Sonda nasoenteral (SNE)", sigla: "SNE", meses: 3 },
  { valor: "svd", rotulo: "Sonda vesical de demora (SVD)", sigla: "SVD", meses: 1 },
  { valor: "cistostomia", rotulo: "Cistostomia", sigla: "Cistostomia", meses: 1 },
] as const;

/** Soma meses a uma data yyyy-mm-dd, mantendo o dia (ou o último dia do mês quando não existir). */
export function somarMeses(iso: string, meses: number) {
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return "";
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
}

export type SituacaoTroca = "vencida" | "proxima" | "ok" | "sem";
/** Classifica a próxima troca: vencida, nos próximos 30 dias, em dia ou sem data. */
export function situacaoTroca(proxima: string | null | undefined, hoje: string): SituacaoTroca {
  if (!proxima) return "sem";
  if (proxima < hoje) return "vencida";
  return proxima <= somarMeses(hoje, 1) ? "proxima" : "ok";
}
