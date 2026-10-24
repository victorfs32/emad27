// Montagem de textos do cadastro usados em vários formulários (rodam no navegador).
import type { Ficha } from "./pacientes";
import { formatarCep, formatarTelefone } from "./validacao";

export function enderecoDe(f: Ficha) {
  const via = [f.rua, f.numero ? `nº ${f.numero}` : "", f.complemento].filter(Boolean).join(", ");
  const local = [f.bairro, f.municipio].filter(Boolean).join(" - ");
  return [[via, local].filter(Boolean).join(", "), f.cep ? `CEP ${formatarCep(f.cep)}` : ""].filter(Boolean).join("  ");
}

export function diagnosticosOrdenados(f: Ficha) {
  return [...f.diagnosticos].sort((a, b) => Number(b.principal) - Number(a.principal));
}

export function diagnosticoTexto(f: Ficha) {
  return diagnosticosOrdenados(f).map((d) => (d.descricao ? `${d.cid} - ${d.descricao}` : d.cid)).join("; ");
}

export function telefoneDe(f: Ficha, quantos = 1) {
  return f.telefones.slice(0, quantos).map((t) => formatarTelefone(t.numero)).join(" / ");
}

export function cuidadorPrincipal(f: Ficha) {
  return f.cuidadores.find((c) => c.principal) ?? f.cuidadores[0] ?? null;
}

/** Ficha usada pelos formulários que o médico completa na tela. */
export type FichaParaDocumento = { ficha: Ficha; medico: string; hoje: string };
