// Funções puras (servidor e navegador).

export const soDigitos = (s: string) => s.replace(/\D/g, "");

export function validarCpf(valor: string): boolean {
  const c = soDigitos(valor);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (const t of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(c[i]) * (t + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== Number(c[t])) return false;
  }
  return true;
}

/** CNS definitivo (começa com 1 ou 2) e provisório (7, 8 ou 9). */
export function validarCns(valor: string): boolean {
  const c = soDigitos(valor);
  if (c.length !== 15) return false;
  if (/^[12]/.test(c)) {
    const pis = c.slice(0, 11);
    let soma = pis.split("").reduce((a, d, i) => a + Number(d) * (15 - i), 0);
    let dv = 11 - (soma % 11);
    if (dv === 11) dv = 0;
    if (dv === 10) {
      soma += 2;
      dv = 11 - (soma % 11);
      return c === `${pis}001${dv}`;
    }
    return c === `${pis}000${dv}`;
  }
  if (/^[789]/.test(c)) {
    return c.split("").reduce((a, d, i) => a + Number(d) * (15 - i), 0) % 11 === 0;
  }
  return false;
}

export function formatarCpf(valor: string | null | undefined) {
  const c = soDigitos(valor ?? "").slice(0, 11);
  return c
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatarCns(valor: string | null | undefined) {
  const c = soDigitos(valor ?? "").slice(0, 15);
  return c.replace(/^(\d{3})(\d)/, "$1 $2").replace(/^(\d{3}) (\d{4})(\d)/, "$1 $2 $3").replace(/^(\d{3}) (\d{4}) (\d{4})(\d)/, "$1 $2 $3 $4");
}

export function formatarTelefone(valor: string | null | undefined) {
  const c = soDigitos(valor ?? "").slice(0, 11);
  if (c.length <= 2) return c;
  if (c.length <= 6) return `(${c.slice(0, 2)}) ${c.slice(2)}`;
  if (c.length <= 10) return `(${c.slice(0, 2)}) ${c.slice(2, 6)}-${c.slice(6)}`;
  return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`;
}

export function formatarCep(valor: string | null | undefined) {
  const c = soDigitos(valor ?? "").slice(0, 8);
  return c.length > 5 ? `${c.slice(0, 5)}-${c.slice(5)}` : c;
}

export const emailValido = (e: string) => e.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

/** Regras mínimas de senha (o Supabase pode exigir mais). Devolve a mensagem do problema ou null. */
export function problemaNaSenha(senha: string): string | null {
  if (senha.length < 10) return "A senha precisa ter pelo menos 10 caracteres.";
  if (senha.length > 72) return "A senha pode ter no máximo 72 caracteres.";
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return "Use letras e números na senha.";
  return null;
}
