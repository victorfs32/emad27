// Feriados que valem em Fortaleza (nacionais, do Ceará e municipais), calculados para qualquer ano.
// Carnaval e Corpus Christi são ponto facultativo, mas o serviço costuma parar; dá para "atender mesmo assim" na agenda.

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher), em UTC. */
function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const somarDias = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

/** Feriados do ano: data (aaaa-mm-dd) -> nome. */
export function feriadosDoAno(ano: number): Record<string, string> {
  const p = pascoa(ano);
  const fixo = (mmdd: string, nome: string) => [`${ano}-${mmdd}`, nome] as const;
  return Object.fromEntries([
    fixo("01-01", "Confraternização Universal"),
    [iso(somarDias(p, -48)), "Carnaval"],
    [iso(somarDias(p, -47)), "Carnaval"],
    fixo("03-19", "São José (Ceará)"),
    fixo("03-25", "Data Magna do Ceará"),
    [iso(somarDias(p, -2)), "Sexta-feira Santa"],
    fixo("04-21", "Tiradentes"),
    fixo("05-01", "Dia do Trabalho"),
    [iso(somarDias(p, 60)), "Corpus Christi"],
    fixo("08-15", "Nossa Senhora da Assunção (Fortaleza)"),
    fixo("09-07", "Independência do Brasil"),
    fixo("10-12", "Nossa Senhora Aparecida"),
    fixo("11-02", "Finados"),
    fixo("11-15", "Proclamação da República"),
    fixo("11-20", "Dia da Consciência Negra"),
    fixo("12-25", "Natal"),
  ]);
}

/** Feriados de um mês "aaaa-mm": data -> nome. */
export function feriadosDoMes(mes: string): Record<string, string> {
  return Object.fromEntries(Object.entries(feriadosDoAno(Number(mes.slice(0, 4)))).filter(([d]) => d.startsWith(mes)));
}
