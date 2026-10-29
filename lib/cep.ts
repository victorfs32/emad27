import "server-only";
// Consulta de CEP no servidor: ViaCEP e, se ele falhar, BrasilAPI. Nenhum dado do paciente é enviado, só o CEP ou a rua.

export type EnderecoCep = { cep: string; rua: string; bairro: string; municipio: string; uf: string; complemento: string };
export type ResultadoCep = { ok: true; endereco: EnderecoCep } | { ok: false; motivo: "nao_encontrado" | "indisponivel" };

const TEMPO = 6000;

async function buscarJson(url: string): Promise<unknown> {
  const r = await fetch(url, { signal: AbortSignal.timeout(TEMPO), headers: { Accept: "application/json" }, cache: "no-store" });
  if (r.status === 404 || r.status === 400) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const soDig = (v: unknown) => txt(v).replace(/\D/g, "");

/** Converte a resposta do ViaCEP; devolve null quando o CEP não existe. */
export function lerViaCep(j: unknown): EnderecoCep | null {
  if (!j || typeof j !== "object" || "erro" in j) return null;
  const o = j as Record<string, unknown>;
  if (soDig(o.cep).length !== 8) return null;
  return { cep: soDig(o.cep), rua: txt(o.logradouro), bairro: txt(o.bairro), municipio: txt(o.localidade), uf: txt(o.uf), complemento: txt(o.complemento) };
}

/** Converte a resposta da BrasilAPI (cep/v1). */
export function lerBrasilApi(j: unknown): EnderecoCep | null {
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  if (soDig(o.cep).length !== 8) return null;
  return { cep: soDig(o.cep), rua: txt(o.street), bairro: txt(o.neighborhood), municipio: txt(o.city), uf: txt(o.state), complemento: "" };
}

/** Endereço de um CEP (8 dígitos). */
export async function consultarCep(cep: string): Promise<ResultadoCep> {
  const c = cep.replace(/\D/g, "");
  if (c.length !== 8) return { ok: false, motivo: "nao_encontrado" };
  try {
    const e = lerViaCep(await buscarJson(`https://viacep.com.br/ws/${c}/json/`));
    return e ? { ok: true, endereco: e } : { ok: false, motivo: "nao_encontrado" };
  } catch (erroViaCep) {
    try {
      const e = lerBrasilApi(await buscarJson(`https://brasilapi.com.br/api/cep/v1/${c}`));
      return e ? { ok: true, endereco: e } : { ok: false, motivo: "nao_encontrado" };
    } catch (erroBrasilApi) {
      console.error("[cep]", String(erroViaCep), String(erroBrasilApi));
      return { ok: false, motivo: "indisponivel" };
    }
  }
}

/** CEPs de uma rua (ViaCEP: UF, cidade e rua com pelo menos 3 letras; até 50 resultados). */
export async function procurarCepPorRua(uf: string, cidade: string, rua: string): Promise<{ ok: true; lista: EnderecoCep[] } | { ok: false; motivo: "indisponivel" }> {
  const u = uf.trim().toUpperCase(), c = cidade.trim(), r = rua.trim().replace(/[/?#]/g, " ");
  if (!/^[A-Z]{2}$/.test(u) || c.length < 3 || r.length < 3) return { ok: true, lista: [] };
  try {
    const j = await buscarJson(`https://viacep.com.br/ws/${u}/${encodeURIComponent(c)}/${encodeURIComponent(r)}/json/`);
    const lista = Array.isArray(j) ? j.map(lerViaCep).filter((e): e is EnderecoCep => e !== null) : [];
    return { ok: true, lista };
  } catch (e) {
    console.error("[cep:rua]", String(e));
    return { ok: false, motivo: "indisponivel" };
  }
}
