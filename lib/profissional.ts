// Identificação do profissional (cadastro do usuário): usada no aviso de cadastro e nos documentos.
import { soDigitos, validarCns, validarCpf } from "./validacao";

export type IdentificacaoProfissional = { cpf: string; cns: string; cbo: string; cnes: string; ine: string };

export const CAMPOS_PROFISSIONAL: { chave: keyof IdentificacaoProfissional; rotulo: string; digitos: number }[] = [
  { chave: "cpf", rotulo: "CPF", digitos: 11 },
  { chave: "cns", rotulo: "CNS", digitos: 15 },
  { chave: "cbo", rotulo: "CBO", digitos: 6 },
  { chave: "cnes", rotulo: "CNES", digitos: 7 },
  { chave: "ine", rotulo: "INE", digitos: 10 },
];

/** Rótulos dos campos que ainda não foram preenchidos. */
export function camposFaltando(i: IdentificacaoProfissional): string[] {
  return CAMPOS_PROFISSIONAL.filter((c) => !i[c.chave]).map((c) => c.rotulo);
}

/** Confere os campos preenchidos e devolve a primeira mensagem de erro (ou null). */
export function problemaNaIdentificacao(i: Partial<IdentificacaoProfissional>): string | null {
  for (const c of CAMPOS_PROFISSIONAL) {
    const v = soDigitos(i[c.chave] ?? "");
    if (!v) continue;
    if (v.length !== c.digitos) return `${c.rotulo} deve ter ${c.digitos} dígitos.`;
  }
  const cpf = soDigitos(i.cpf ?? "");
  if (cpf && !validarCpf(cpf)) return "CPF inválido. Confira os números.";
  const cns = soDigitos(i.cns ?? "");
  if (cns && !validarCns(cns)) return "CNS inválido. Confira os números.";
  return null;
}
