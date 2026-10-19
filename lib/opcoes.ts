export const STATUS = [
  { valor: "ativo", rotulo: "Em acompanhamento", cor: "bg-emerald-100 text-emerald-800" },
  { valor: "internado", rotulo: "Internado", cor: "bg-amber-100 text-amber-800" },
  { valor: "suspenso", rotulo: "Suspenso", cor: "bg-slate-200 text-slate-700" },
  { valor: "alta", rotulo: "Alta", cor: "bg-sky-100 text-sky-800" },
  { valor: "obito", rotulo: "Óbito", cor: "bg-zinc-300 text-zinc-800" },
] as const;

export const MODALIDADES = ["AD1", "AD2", "AD3"] as const;

export const SEXOS = [
  { valor: "F", rotulo: "Feminino" },
  { valor: "M", rotulo: "Masculino" },
  { valor: "O", rotulo: "Outro" },
] as const;

export const TIPOS_EVOLUCAO = [
  "Visita domiciliar",
  "Contato telefônico",
  "Intercorrência",
  "Avaliação inicial",
  "Procedimento",
  "Outro",
] as const;

export function rotuloStatus(valor: string) {
  return STATUS.find((s) => s.valor === valor) ?? STATUS[0];
}

export function formatarData(iso: string | null | undefined) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : "—";
}

export function calcularIdade(nascimento: string | null | undefined) {
  if (!nascimento) return null;
  const [a, m, d] = nascimento.split("-").map(Number);
  if (!a || !m || !d) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade--;
  return idade >= 0 ? idade : null;
}
