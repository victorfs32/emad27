import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { supabaseServidor } from "./supabase/servidor";
import { exigirUsuario } from "./auth";
import {
  CONTINENCIA, DE_QUEM, DIURESE, FISIO, MODALIDADES, SITUACOES, SITUACOES_ARQUIVADAS, SITUACOES_PRINCIPAIS,
  PROCEDIMENTOS, SEXOS, TIPOS_DISPOSITIVO, TIPO_VISITA, VIAS_DIETA, VIAS_SONDA, hojeISO, limitesDoMes, somarMeses,
} from "./opcoes";
import { soDigitos, validarCns, validarCpf } from "./validacao";
import { formularioVazio, type DadosForm, type Duplicado, type TriEstado } from "./formulario";

// ------------------------------------------------------------------ tipos
export type Grupo = "principais" | "arquivados";

export type ItemLista = {
  id: number; prontuario: string; nome: string; data_nascimento: string | null; cpf: string | null; cns: string | null;
  situacao: string; modalidade: string | null; uaps_id: number | null; uaps: string | null; bairro: string | null;
  admissao: string; fisio: string | null; dieta_vias: string[]; diurese: string | null;
  tqt: boolean | null; lpp: boolean | null; o2: boolean | null; proxima_visita: string | null; ultima_evolucao: string | null;
};

export type Filtros = {
  grupo: Grupo; q: string; uaps: string; bairro: string; situacao: string; modalidade: string;
  de: string; ate: string; fisio: string; dieta: string; diurese: string; tqt: string; lpp: string; o2: string;
};

export const filtrosVazios = (grupo: Grupo): Filtros => ({
  grupo, q: "", uaps: "", bairro: "", situacao: "", modalidade: "", de: "", ate: "",
  fisio: "", dieta: "", diurese: "", tqt: "", lpp: "", o2: "",
});

type Bool = boolean | null;
export type Ficha = {
  id: number; prontuario: string; nome: string; uaps_id: number | null; uaps: { nome: string } | null;
  situacao: string; modalidade: string | null; situacao_data: string | null; situacao_motivo: string | null; situacao_obs: string | null;
  data_nascimento: string | null; admissao: string; cpf: string | null; cns: string | null; rg: string | null; nome_mae: string | null; nome_pai: string | null; sexo: string | null;
  cep: string | null; municipio: string | null; bairro: string | null; rua: string | null; numero: string | null;
  complemento: string | null; referencia: string | null;
  fisio: string | null; fisio_frequencia: string | null; fisio_obs: string | null;
  dieta_vias: string[]; dieta_outra: string | null; dieta_obs: string | null;
  diurese: string | null; diurese_outra: string | null; usa_fralda: Bool; continencia: string | null;
  tqt: Bool; tqt_canula_tipo: string | null; tqt_calibre: string | null; tqt_ultima_troca: string | null; tqt_obs: string | null;
  lpp: Bool; o2: Bool; o2_dispositivo: string | null; o2_fluxo: number | null; o2_regime: string | null; o2_obs: string | null;
  proxima_visita: string | null; observacoes: string | null; usa_cama_pmec: Bool; colostomia: Bool;
  criado_em: string; atualizado_em: string;
  telefones: { id: number; numero: string; de_quem: string; whatsapp: Bool }[];
  cuidadores: { id: number; nome: string; principal: boolean; vinculo: string | null; telefone: string | null; cns: string | null; cpf: string | null }[];
  diagnosticos: { id: number; cid: string; descricao: string | null; principal: boolean }[];
  lesoes_pressao: { id: number; localizacao: string; classificacao: string | null; cobertura: string | null; data_avaliacao: string | null }[];
  admissoes: { id: number; admissao: string | null; saida: string | null; situacao_saida: string | null; motivo: string | null; obs: string | null }[];
  dispositivos: { id: number; tipo: string; numero: string | null; confeccao: string | null; troca: string | null; proxima_troca: string | null; obs: string | null }[];
};

export type Evolucao = { id: number; data: string; tipo: string; texto: string; autor: string };
export type RegistroHistorico = {
  id: number; em: string; autor: string; tipo: string; resumo: string; detalhes: Record<string, unknown> | null;
};
export type Uaps = { id: number; nome: string };

function ok<T>(r: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

// ------------------------------------------------------------------ consultas
/** Aplica os filtros combinados à view pacientes_resumo (ou a qualquer consulta equivalente). */
function aplicarFiltros<Q>(consulta: Q, f: Filtros): Q {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = consulta;
  const grupo = f.grupo === "arquivados" ? SITUACOES_ARQUIVADAS : SITUACOES_PRINCIPAIS;
  q = q.in("situacao", [...grupo]);
  if (f.situacao && (grupo as readonly string[]).includes(f.situacao)) q = q.eq("situacao", f.situacao);
  if (/^\d+$/.test(f.uaps)) q = q.eq("uaps_id", Number(f.uaps));
  if (f.bairro) q = q.eq("bairro", f.bairro);
  if ((MODALIDADES as readonly string[]).includes(f.modalidade)) q = q.eq("modalidade", f.modalidade);
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.de)) q = q.gte("admissao", f.de);
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.ate)) q = q.lte("admissao", f.ate);
  if (FISIO.some((x) => x.valor === f.fisio)) q = q.eq("fisio", f.fisio);
  if (VIAS_DIETA.some((x) => x.valor === f.dieta)) q = q.contains("dieta_vias", [f.dieta]);
  if (DIURESE.some((x) => x.valor === f.diurese)) q = q.eq("diurese", f.diurese);
  for (const campo of ["tqt", "lpp", "o2"] as const) {
    const v = f[campo];
    if (v === "sim") q = q.eq(campo, true);
    else if (v === "nao") q = q.eq(campo, false);
    else if (v === "ni") q = q.is(campo, null);
  }
  const busca = f.q.trim();
  if (busca) {
    // remove caracteres que têm significado na sintaxe do filtro .or()
    const t = busca.replace(/[,()%*\\]/g, " ").trim();
    const dig = soDigitos(busca);
    const partes = [`nome.ilike.%${t}%`, `prontuario.ilike.%${t}%`];
    if (dig.length >= 3) partes.push(`cpf.like.%${dig}%`, `cns.like.%${dig}%`);
    if (t) q = q.or(partes.join(","));
  }
  return q as Q;
}

export async function listarPacientes(f: Filtros): Promise<ItemLista[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  return ok(await aplicarFiltros(sb.from("pacientes_resumo").select("*").order("nome"), f)) as ItemLista[];
}

export async function listarProximasVisitas(): Promise<ItemLista[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  return ok(
    await sb.from("pacientes_resumo").select("*").in("situacao", [...SITUACOES_PRINCIPAIS])
      .not("proxima_visita", "is", null).order("proxima_visita").order("nome"),
  ) as ItemLista[];
}

export type Resumo = {
  cadastrados: number; ativos: number; visitas7dias: number; lpp: number; arquivados: number;
  tqt: number; o2: number; sonda: number; dispositivos: number; lesoes: number; visitasMes: number; procedimentosMes: number;
  porUaps: { nome: string; n: number }[]; porModalidade: { nome: string; n: number }[];
};

/** Números do painel e do menu lateral. */
export const resumoPainel = cache(async (): Promise<Resumo> => {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const linhas = ok(
    await sb.from("pacientes_resumo").select("situacao, proxima_visita, lpp, tqt, o2, dieta_vias, diurese, uaps, modalidade"),
  ) as { situacao: string; proxima_visita: string | null; lpp: Bool; tqt: Bool; o2: Bool; dieta_vias: string[]; diurese: string | null; uaps: string | null; modalidade: string | null }[];

  await connection(); // usa a data atual: não pode entrar na pré-renderização
  const hoje = hojeISO();
  const limite = hojeISO(7);
  const r: Resumo = {
    cadastrados: 0, ativos: 0, visitas7dias: 0, lpp: 0, arquivados: 0, tqt: 0, o2: 0, sonda: 0, dispositivos: 0, lesoes: 0, visitasMes: 0, procedimentosMes: 0, porUaps: [], porModalidade: [],
  };
  const uaps = new Map<string, number>();
  const mod = new Map<string, number>();
  for (const l of linhas) {
    if ((SITUACOES_ARQUIVADAS as readonly string[]).includes(l.situacao)) {
      r.arquivados++;
      continue;
    }
    r.cadastrados++;
    if (l.situacao === "ativo") r.ativos++;
    if (l.lpp) r.lpp++;
    if (l.tqt) r.tqt++;
    if (l.o2) r.o2++;
    const sonda = !!l.dieta_vias?.some((v) => (VIAS_SONDA as readonly string[]).includes(v));
    if (sonda) r.sonda++;
    if (l.proxima_visita && l.proxima_visita >= hoje && l.proxima_visita <= limite) r.visitas7dias++;
    uaps.set(l.uaps ?? "Não informada", (uaps.get(l.uaps ?? "Não informada") ?? 0) + 1);
    mod.set(l.modalidade ?? "Não informada", (mod.get(l.modalidade ?? "Não informada") ?? 0) + 1);
  }
  const contagemLesoes = await sb
    .from("lesoes_pressao")
    .select("id, pacientes!inner(situacao)", { count: "exact", head: true })
    .in("pacientes.situacao", [...SITUACOES_PRINCIPAIS]);
  r.lesoes = contagemLesoes.count ?? 0;
  const contagemDisp = await sb
    .from("dispositivos")
    .select("id, pacientes!inner(situacao)", { count: "exact", head: true })
    .in("pacientes.situacao", [...SITUACOES_PRINCIPAIS]);
  r.dispositivos = contagemDisp.count ?? 0;
  const { inicio, fim } = limitesDoMes(hoje.slice(0, 7));
  const [cVisitas, cProc] = await Promise.all([
    sb.from("evolucoes").select("id", { count: "exact", head: true }).eq("tipo", TIPO_VISITA).gte("data", inicio).lt("data", fim),
    sb.from("procedimentos").select("id", { count: "exact", head: true }).gte("data", inicio).lt("data", fim),
  ]);
  r.visitasMes = cVisitas.count ?? 0;
  r.procedimentosMes = cProc.count ?? 0;
  const ordenar = (m: Map<string, number>) => [...m].map(([nome, n]) => ({ nome, n })).sort((a, b) => b.n - a.n);
  r.porUaps = ordenar(uaps);
  r.porModalidade = ordenar(mod);
  return r;
});

export async function listarUapss(): Promise<Uaps[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  return ok(await sb.from("uapss").select("id, nome").eq("ativo", true).order("nome")) as Uaps[];
}

export async function listarBairros(): Promise<string[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const linhas = ok(await sb.from("pacientes").select("bairro").not("bairro", "is", null)) as { bairro: string }[];
  return [...new Set(linhas.map((l) => l.bairro))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function obterFicha(id: number): Promise<Ficha | null> {
  await exigirUsuario();
  if (!Number.isSafeInteger(id)) return null;
  const sb = await supabaseServidor();
  const r = await sb
    .from("pacientes")
    .select("*, uaps:uapss(nome), telefones(*), cuidadores(*), diagnosticos(*), lesoes_pressao(*), admissoes(*), dispositivos(*)")
    .eq("id", id)
    .order("id", { referencedTable: "telefones" })
    .order("id", { referencedTable: "cuidadores" })
    .order("id", { referencedTable: "diagnosticos" })
    .order("id", { referencedTable: "lesoes_pressao" })
    .order("id", { referencedTable: "admissoes", ascending: false })
    .order("id", { referencedTable: "dispositivos" })
    .maybeSingle();
  return ok(r) as unknown as Ficha | null;
}

export async function listarEvolucoes(pacienteId: number): Promise<Evolucao[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  return ok(
    await sb.from("evolucoes").select("id, data, tipo, texto, autor").eq("paciente_id", pacienteId)
      .order("data", { ascending: false }).order("id", { ascending: false }),
  ) as Evolucao[];
}

export async function listarHistorico(pacienteId: number): Promise<RegistroHistorico[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  return ok(
    await sb.from("historico").select("id, em, autor, tipo, resumo, detalhes").eq("paciente_id", pacienteId)
      .order("em", { ascending: false }).order("id", { ascending: false }),
  ) as RegistroHistorico[];
}

export async function buscarCid(termo: string): Promise<{ codigo: string; descricao: string }[]> {
  await exigirUsuario();
  const t = termo.replace(/[,()%*\\]/g, " ").trim();
  if (t.length < 2) return [];
  const sb = await supabaseServidor();
  return ok(
    await sb.from("cid10").select("codigo, descricao").or(`codigo.ilike.${t}%,descricao.ilike.%${t}%`).order("codigo").limit(12),
  ) as { codigo: string; descricao: string }[];
}

export async function verificarDuplicados(idAtual: number | null, cpf: string | null, cns: string | null): Promise<Duplicado[]> {
  const sb = await supabaseServidor();
  const achados: Duplicado[] = [];
  for (const [campo, valor] of [["CPF", cpf], ["CNS", cns]] as const) {
    if (!valor) continue;
    let q = sb.from("pacientes").select("id, nome, prontuario").eq(campo.toLowerCase(), valor);
    if (idAtual) q = q.neq("id", idAtual);
    for (const p of ok(await q) as { id: number; nome: string; prontuario: string }[]) achados.push({ ...p, campo });
  }
  return achados;
}

// ------------------------------------------------------------------ gravação
const dataOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const nul = (s: string) => s.trim() || null;
const tri = (v: TriEstado | string): Bool => (v === "sim" ? true : v === "nao" ? false : null);
const triForm = (v: Bool): TriEstado => (v === true ? "sim" : v === false ? "nao" : "");

type Normalizado = { erro: string } | { erro?: undefined; paciente: Record<string, unknown>; listas: Record<string, unknown[]>; cpf: string | null; cns: string | null; uapsNova: string | null };

/** Valida e converte o formulário no formato que a função salvar_paciente espera. */
export function normalizar(d: DadosForm): Normalizado {
  const prontuario = d.prontuario.trim();
  if (!prontuario) return { erro: "Informe o prontuário." };
  if (prontuario.length > 30) return { erro: "Prontuário muito longo." };
  if (!d.nome.trim()) return { erro: "Informe o nome do paciente." };
  if (!SITUACOES.some((s) => s.valor === d.situacao)) return { erro: "Selecione a situação." };
  if (!dataOk(d.admissao)) return { erro: "Informe a data de admissão." };

  for (const [rotulo, v] of [
    ["data de nascimento", d.data_nascimento], ["data da situação", d.situacao_data], ["próxima visita", d.proxima_visita],
    ["última troca da cânula", d.tqt_ultima_troca],
  ] as const)
    if (v && !dataOk(v)) return { erro: `A ${rotulo} é inválida.` };

  const cpf = soDigitos(d.cpf) || null;
  const cns = soDigitos(d.cns) || null;
  if (cpf && !validarCpf(cpf)) return { erro: "CPF do paciente inválido." };
  if (cns && !validarCns(cns)) return { erro: "CNS do paciente inválido." };
  if (d.modalidade && !(MODALIDADES as readonly string[]).includes(d.modalidade)) return { erro: "Modalidade inválida." };
  if (d.sexo && !SEXOS.some((x) => x.valor === d.sexo)) return { erro: "Sexo inválido." };
  if (d.fisio && !FISIO.some((x) => x.valor === d.fisio)) return { erro: "Fisioterapia inválida." };
  if (d.diurese && !DIURESE.some((x) => x.valor === d.diurese)) return { erro: "Diurese inválida." };
  if (d.continencia && !CONTINENCIA.some((x) => x.valor === d.continencia)) return { erro: "Continência inválida." };
  const vias = d.dieta_vias.filter((v) => VIAS_DIETA.some((x) => x.valor === v));

  let fluxo: number | null = null;
  if (d.o2 === "sim" && d.o2_fluxo.trim()) {
    fluxo = Number(d.o2_fluxo.replace(",", "."));
    if (!Number.isFinite(fluxo) || fluxo <= 0 || fluxo > 40) return { erro: "Fluxo de oxigênio inválido (L/min)." };
  }

  const telefones = d.telefones.filter((t) => t.numero.trim()).map((t) => ({
    numero: soDigitos(t.numero), de_quem: t.de_quem, whatsapp: tri(t.whatsapp),
  }));
  for (const t of telefones) {
    if (t.numero.length < 10 || t.numero.length > 11) return { erro: "Há telefone com número incompleto (use DDD + número)." };
    if (!DE_QUEM.some((x) => x.valor === t.de_quem)) return { erro: "Informe de quem é cada telefone." };
  }

  const cuidadores = d.cuidadores.filter((c) => c.nome.trim() || c.cpf.trim() || c.cns.trim() || c.telefone.trim());
  for (const c of cuidadores) {
    if (!c.nome.trim()) return { erro: "Informe o nome de cada cuidador." };
    if (c.cpf.trim() && !validarCpf(c.cpf)) return { erro: `CPF do cuidador ${c.nome.trim()} inválido.` };
    if (c.cns.trim() && !validarCns(c.cns)) return { erro: `CNS do cuidador ${c.nome.trim()} inválido.` };
  }
  if (cuidadores.filter((c) => c.principal).length > 1) return { erro: "Só pode haver um cuidador principal." };
  if (cuidadores.length && !cuidadores.some((c) => c.principal)) cuidadores[0].principal = true;

  const diagnosticos = d.diagnosticos.filter((x) => x.cid.trim());
  if (diagnosticos.filter((x) => x.principal).length > 1) return { erro: "Só pode haver um diagnóstico principal." };
  if (diagnosticos.length && !diagnosticos.some((x) => x.principal)) diagnosticos[0].principal = true;

  const lesoes = d.lpp === "sim" ? d.lesoes.filter((l) => l.localizacao.trim()) : [];
  for (const l of lesoes) if (l.data_avaliacao && !dataOk(l.data_avaliacao)) return { erro: "Data de avaliação da lesão inválida." };

  const ativo = d.situacao === "ativo";
  const paciente = {
    prontuario, nome: d.nome.trim().replace(/\s+/g, " "), situacao: d.situacao, modalidade: nul(d.modalidade),
    situacao_data: ativo ? null : nul(d.situacao_data), situacao_motivo: ativo ? null : nul(d.situacao_motivo),
    situacao_obs: ativo ? null : nul(d.situacao_obs),
    data_nascimento: nul(d.data_nascimento), admissao: d.admissao, cpf, cns, rg: nul(d.rg), nome_mae: nul(d.nome_mae), nome_pai: nul(d.nome_pai), sexo: nul(d.sexo),
    cep: soDigitos(d.cep) || null, municipio: nul(d.municipio), bairro: nul(d.bairro), rua: nul(d.rua), numero: nul(d.numero),
    complemento: nul(d.complemento), referencia: nul(d.referencia),
    fisio: nul(d.fisio), fisio_frequencia: d.fisio === "sim" ? nul(d.fisio_frequencia) : null, fisio_obs: nul(d.fisio_obs),
    dieta_vias: vias, dieta_outra: vias.includes("outra") ? nul(d.dieta_outra) : null, dieta_obs: nul(d.dieta_obs),
    diurese: nul(d.diurese), diurese_outra: d.diurese === "outra" ? nul(d.diurese_outra) : null,
    usa_fralda: tri(d.usa_fralda), continencia: nul(d.continencia),
    tqt: tri(d.tqt),
    tqt_canula_tipo: d.tqt === "sim" ? nul(d.tqt_canula_tipo) : null, tqt_calibre: d.tqt === "sim" ? nul(d.tqt_calibre) : null,
    tqt_ultima_troca: d.tqt === "sim" ? nul(d.tqt_ultima_troca) : null, tqt_obs: d.tqt === "sim" ? nul(d.tqt_obs) : null,
    lpp: tri(d.lpp),
    o2: tri(d.o2), o2_dispositivo: d.o2 === "sim" ? nul(d.o2_dispositivo) : null, o2_fluxo: fluxo,
    o2_regime: d.o2 === "sim" ? nul(d.o2_regime) : null, o2_obs: d.o2 === "sim" ? nul(d.o2_obs) : null,
    proxima_visita: nul(d.proxima_visita), observacoes: nul(d.observacoes), usa_cama_pmec: tri(d.usa_cama_pmec), colostomia: tri(d.colostomia),
    uaps_id: /^\d+$/.test(d.uaps_id) ? Number(d.uaps_id) : null,
  };
  return {
    paciente, cpf, cns, uapsNova: d.uaps_id === "nova" ? nul(d.uaps_nova) : null,
    listas: {
      telefones,
      cuidadores: cuidadores.map((c) => ({
        nome: c.nome.trim(), principal: c.principal, vinculo: nul(c.vinculo), telefone: soDigitos(c.telefone) || null,
        cns: soDigitos(c.cns) || null, cpf: soDigitos(c.cpf) || null,
      })),
      diagnosticos: diagnosticos.map((x) => ({ cid: x.cid.trim().toUpperCase(), descricao: nul(x.descricao), principal: x.principal })),
      lesoes_pressao: lesoes.map((l) => ({
        localizacao: l.localizacao.trim(), classificacao: nul(l.classificacao), cobertura: nul(l.cobertura), data_avaliacao: nul(l.data_avaliacao),
      })),
    },
  };
}

export async function gravarPaciente(
  id: number | null, d: DadosForm, confirmarDuplicado: boolean,
): Promise<{ erro?: string; duplicados?: Duplicado[]; id?: number }> {
  const u = await exigirUsuario();
  if (id === null ? !u.perms.cadastrar : !u.perms.editar) return { erro: "Você não tem permissão para esta ação." };

  const n = normalizar(d);
  if (n.erro !== undefined) return { erro: n.erro };

  const sb = await supabaseServidor();
  if (!confirmarDuplicado) {
    const dup = await verificarDuplicados(id, n.cpf, n.cns);
    if (dup.length) return { duplicados: dup };
  }

  if (n.uapsNova) {
    const existente = ok(await sb.from("uapss").select("id").ilike("nome", n.uapsNova).maybeSingle()) as { id: number } | null;
    if (existente) n.paciente.uaps_id = existente.id;
    else n.paciente.uaps_id = (ok(await sb.from("uapss").insert({ nome: n.uapsNova }).select("id").single()) as { id: number }).id;
  }

  const r = await sb.rpc("salvar_paciente", { p_id: id, p: { paciente: n.paciente, ...n.listas } });
  if (r.error) {
    if (r.error.code === "23505") return { erro: "Já existe um paciente com este prontuário." };
    if (r.error.code === "42501") return { erro: "Você não tem permissão para esta ação." };
    console.error("[gravarPaciente]", r.error.message);
    return { erro: "Não foi possível salvar. Tente novamente; se continuar, avise a coordenação." };
  }
  return { id: r.data as number };
}

export async function definirProximaVisita(id: number, data: string | null) {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const r = await sb.rpc("definir_proxima_visita", { p_id: id, p_data: data });
  if (r.error) throw new Error(r.error.message);
}

export async function reAdmitir(id: number, data: string) {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const r = await sb.rpc("nova_admissao", { p_id: id, p_data: data });
  if (r.error) throw new Error(r.error.message);
}

export async function adicionarEvolucao(pacienteId: number, e: { data: string; tipo: string; texto: string }) {
  await exigirUsuario();
  const sb = await supabaseServidor();
  ok(await sb.from("evolucoes").insert({ paciente_id: pacienteId, ...e }));
}

// ------------------------------------------------------------------ ficha -> formulário
export function paraFormulario(f: Ficha): DadosForm {
  const v = formularioVazio();
  const s = (x: string | number | null | undefined) => (x === null || x === undefined ? "" : String(x));
  return {
    ...v,
    prontuario: f.prontuario, nome: f.nome, uaps_id: s(f.uaps_id), situacao: f.situacao, modalidade: s(f.modalidade),
    situacao_data: s(f.situacao_data), situacao_motivo: s(f.situacao_motivo), situacao_obs: s(f.situacao_obs),
    data_nascimento: s(f.data_nascimento), admissao: s(f.admissao), cpf: s(f.cpf), cns: s(f.cns), rg: s(f.rg), nome_mae: s(f.nome_mae), nome_pai: s(f.nome_pai), sexo: s(f.sexo),
    cep: s(f.cep), municipio: s(f.municipio), bairro: s(f.bairro), rua: s(f.rua), numero: s(f.numero),
    complemento: s(f.complemento), referencia: s(f.referencia),
    fisio: s(f.fisio), fisio_frequencia: s(f.fisio_frequencia), fisio_obs: s(f.fisio_obs),
    dieta_vias: f.dieta_vias ?? [], dieta_outra: s(f.dieta_outra), dieta_obs: s(f.dieta_obs),
    diurese: s(f.diurese), diurese_outra: s(f.diurese_outra), usa_fralda: triForm(f.usa_fralda), continencia: s(f.continencia),
    tqt: triForm(f.tqt), tqt_canula_tipo: s(f.tqt_canula_tipo), tqt_calibre: s(f.tqt_calibre),
    tqt_ultima_troca: s(f.tqt_ultima_troca), tqt_obs: s(f.tqt_obs),
    lpp: triForm(f.lpp),
    o2: triForm(f.o2), o2_dispositivo: s(f.o2_dispositivo), o2_fluxo: s(f.o2_fluxo), o2_regime: s(f.o2_regime), o2_obs: s(f.o2_obs),
    proxima_visita: s(f.proxima_visita), observacoes: s(f.observacoes), usa_cama_pmec: triForm(f.usa_cama_pmec), colostomia: triForm(f.colostomia),
    telefones: f.telefones.map((t) => ({ numero: t.numero, de_quem: t.de_quem, whatsapp: triForm(t.whatsapp) })),
    cuidadores: f.cuidadores.map((c) => ({
      nome: c.nome, principal: c.principal, vinculo: s(c.vinculo), telefone: s(c.telefone), cns: s(c.cns), cpf: s(c.cpf),
    })),
    diagnosticos: f.diagnosticos.map((x) => ({ cid: x.cid, descricao: s(x.descricao), principal: x.principal })),
    lesoes: f.lesoes_pressao.map((l) => ({
      localizacao: l.localizacao, classificacao: s(l.classificacao), cobertura: s(l.cobertura), data_avaliacao: s(l.data_avaliacao),
    })),
  };
}

// ------------------------------------------------------------------ exportação e equipe
export async function listarParaExportar(f: Filtros): Promise<Ficha[]> {
  const u = await exigirUsuario();
  if (!u.perms.exportar) throw new Error("Sem permissão para exportar.");
  const sb = await supabaseServidor();
  const ids = ok(await aplicarFiltros(sb.from("pacientes_resumo").select("id").order("nome"), f)) as { id: number }[];
  if (!ids.length) return [];
  return ok(
    await sb.from("pacientes").select("*, uaps:uapss(nome), telefones(*), cuidadores(*), diagnosticos(*), lesoes_pressao(*), admissoes(*), dispositivos(*)")
      .in("id", ids.map((i) => i.id)).order("nome"),
  ) as unknown as Ficha[];
}

export type Perfil = {
  user_id: string; nome: string; ativo: boolean; admin: boolean; pode_cadastrar: boolean; pode_editar: boolean; pode_exportar: boolean; pode_prescrever: boolean;
};

export async function listarPerfis(): Promise<Perfil[]> {
  const u = await exigirUsuario();
  if (!u.perms.admin) throw new Error("Sem permissão.");
  const sb = await supabaseServidor();
  return ok(await sb.from("perfis").select("*").order("nome")) as Perfil[];
}

export async function salvarPerfil(userId: string, p: Omit<Perfil, "user_id">) {
  const u = await exigirUsuario();
  if (!u.perms.admin) throw new Error("Sem permissão.");
  const sb = await supabaseServidor();
  ok(await sb.from("perfis").update(p).eq("user_id", userId));
}


/** Lê os filtros da URL (?q=…&uaps=…) com segurança. */
export function lerFiltros(sp: Record<string, string | string[] | undefined>, grupo: Grupo): Filtros {
  const f = filtrosVazios(grupo);
  for (const k of Object.keys(f) as (keyof Filtros)[]) {
    if (k === "grupo") continue;
    const v = sp[k];
    if (typeof v === "string") (f[k] as string) = v.trim().slice(0, 100);
  }
  return f;
}

// ------------------------------------------------------------------ dispositivos e lesões
export type DispositivoLinha = {
  id: number; paciente_id: number; tipo: string; numero: string | null; confeccao: string | null;
  troca: string | null; proxima_troca: string | null; obs: string | null;
  pacientes: { id: number; nome: string; prontuario: string; situacao: string; uaps: { nome: string } | null };
};

/** Dispositivos dos pacientes da lista padrão (filtragem por tipo/prazo é feita na página). */
export async function listarDispositivos(): Promise<DispositivoLinha[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  return ok(
    await sb
      .from("dispositivos")
      .select("id, paciente_id, tipo, numero, confeccao, troca, proxima_troca, obs, pacientes!inner(id, nome, prontuario, situacao, uaps:uapss(nome))")
      .in("pacientes.situacao", [...SITUACOES_PRINCIPAIS]),
  ) as unknown as DispositivoLinha[];
}

export async function listarPacientesBasico(): Promise<{ id: number; nome: string; prontuario: string; uaps: string | null }[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  return ok(
    await sb.from("pacientes_resumo").select("id, nome, prontuario, uaps").in("situacao", [...SITUACOES_PRINCIPAIS]).order("nome"),
  ) as { id: number; nome: string; prontuario: string; uaps: string | null }[];
}

export type DadosDispositivo = {
  tipo: string; numero: string; confeccao: string; troca: string; proxima_troca: string; obs: string;
};

export async function gravarDispositivo(id: number | null, pacienteId: number, d: DadosDispositivo): Promise<{ erro?: string }> {
  const u = await exigirUsuario();
  if (!u.perms.editar) return { erro: "Você não tem permissão para esta ação." };
  if (!TIPOS_DISPOSITIVO.some((t) => t.valor === d.tipo)) return { erro: "Selecione o tipo de dispositivo." };
  for (const [r, v] of [["troca", d.troca], ["próxima troca", d.proxima_troca]] as const)
    if (v && !dataOk(v)) return { erro: `A data da ${r} é inválida.` };
  if (d.troca && d.proxima_troca && d.proxima_troca < d.troca) return { erro: "A próxima troca não pode ser anterior à troca." };
  const sb = await supabaseServidor();
  const r = await sb.rpc("salvar_dispositivo", {
    p_id: id, p_paciente: pacienteId,
    p: {
      tipo: d.tipo, numero: nul(d.numero.slice(0, 30)), confeccao: nul(d.confeccao.slice(0, 20)),
      troca: nul(d.troca), proxima_troca: nul(d.proxima_troca), obs: nul(d.obs.slice(0, 500)),
    },
  });
  if (r.error) {
    console.error("[gravarDispositivo]", r.error.message);
    return { erro: r.error.code === "42501" ? "Você não tem permissão para esta ação." : "Não foi possível salvar. Tente novamente; se continuar, avise a coordenação." };
  }
  return {};
}

export async function trocarDispositivo(id: number, data: string) {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const d = ok(await sb.from("dispositivos").select("tipo").eq("id", id).maybeSingle()) as { tipo: string } | null;
  if (!d) throw new Error("Dispositivo não encontrado.");
  const meses = TIPOS_DISPOSITIVO.find((t) => t.valor === d.tipo)?.meses ?? 3;
  const r = await sb.rpc("registrar_troca", { p_id: id, p_troca: data, p_proxima: somarMeses(data, meses) });
  if (r.error) throw new Error(r.error.message);
}

export async function removerDispositivo(id: number) {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const r = await sb.rpc("remover_dispositivo", { p_id: id });
  if (r.error) throw new Error(r.error.message);
}

export type LesaoComPaciente = {
  id: number; localizacao: string; classificacao: string | null; cobertura: string | null; data_avaliacao: string | null;
  pacientes: { id: number; nome: string; prontuario: string; bairro: string | null };
};

/** Lesões por pressão registradas, dos pacientes da lista padrão (mais antigas primeiro). */
export async function listarLesoes(): Promise<LesaoComPaciente[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  return ok(
    await sb
      .from("lesoes_pressao")
      .select("id, localizacao, classificacao, cobertura, data_avaliacao, pacientes!inner(id, nome, prontuario, bairro, situacao)")
      .in("pacientes.situacao", [...SITUACOES_PRINCIPAIS])
      .order("data_avaliacao", { ascending: true, nullsFirst: true })
      .order("id"),
  ) as unknown as LesaoComPaciente[];
}

// ------------------------------------------------------------------ controle de visitas
export type VisitaRegistro = { id: number; paciente_id: number; data: string; usuario_id: string | null; autor: string; texto: string };
export type LinhaVisitas = {
  id: number; nome: string; prontuario: string; uaps: string | null; bairro: string | null;
  proxima_visita: string | null; situacao: string; visitas: VisitaRegistro[]; ultima: string | null;
};

/** Pacientes da lista padrão com as visitas domiciliares do mês selecionado. */
export async function listarControleVisitas(mes: string, apenasUsuario: string | null): Promise<LinhaVisitas[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const { inicio, fim } = limitesDoMes(mes);

  const pacientes = await sb.from("pacientes_resumo").select("id, nome, prontuario, uaps, bairro, proxima_visita, situacao")
    .in("situacao", [...SITUACOES_PRINCIPAIS]).order("nome");
  // O Supabase devolve no máximo 1000 linhas por consulta: busca em páginas até acabar.
  const regs: VisitaRegistro[] = [];
  for (let de = 0; ; de += 1000) {
    const pagina = ok(
      await sb.from("evolucoes").select("id, paciente_id, data, usuario_id, autor, texto").eq("tipo", TIPO_VISITA)
        .gte("data", inicio).lt("data", fim).order("data").order("id").range(de, de + 999),
    ) as VisitaRegistro[];
    regs.push(...pagina);
    if (pagina.length < 1000) break;
  }
  return (ok(pacientes) as Omit<LinhaVisitas, "visitas" | "ultima">[]).map((p) => {
    const dele = regs.filter((r) => r.paciente_id === p.id && (!apenasUsuario || r.usuario_id === apenasUsuario));
    const doMes = dele.filter((r) => r.data >= inicio);
    return { ...p, visitas: doMes, ultima: dele.length ? dele[dele.length - 1].data : null };
  });
}

export async function registrarVisita(pacienteId: number, data: string, nota: string): Promise<{ erro?: string }> {
  const sb = await supabaseServidor();
  const ja = ok(
    await sb.from("evolucoes").select("id, autor").eq("paciente_id", pacienteId).eq("tipo", TIPO_VISITA).eq("data", data).limit(1),
  ) as { id: number; autor: string }[];
  if (ja.length) return { erro: `Já existe visita registrada neste dia (por ${ja[0].autor}).` };
  await adicionarEvolucao(pacienteId, { data, tipo: TIPO_VISITA, texto: nota.trim() || "Visita domiciliar realizada." });
  return {};
}

/** Remove um registro de acompanhamento lançado por engano (fica no histórico do paciente). */
export async function removerRegistro(id: number) {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const r = await sb.rpc("remover_evolucao", { p_id: id });
  if (r.error) throw new Error(r.error.message);
}

// ------------------------------------------------------------------ procedimentos
export type Procedimento = {
  id: number; paciente_id: number; data: string; tipo: string; obs: string | null; autor: string;
  pacientes: { id: number; nome: string; prontuario: string; uaps: { nome: string } | null };
};

export async function listarProcedimentos(f: { mes?: string; tipo?: string; pacienteId?: number }): Promise<Procedimento[]> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const itens: Procedimento[] = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from("procedimentos").select("id, paciente_id, data, tipo, obs, autor, pacientes!inner(id, nome, prontuario, uaps:uapss(nome))")
      .order("data", { ascending: false }).order("id", { ascending: false });
    if (f.mes) {
      const { inicio, fim } = limitesDoMes(f.mes);
      q = q.gte("data", inicio).lt("data", fim);
    }
    if (f.tipo) q = q.eq("tipo", f.tipo);
    if (f.pacienteId) q = q.eq("paciente_id", f.pacienteId);
    const pagina = ok(await q.range(de, de + 999)) as unknown as Procedimento[];
    itens.push(...pagina);
    if (pagina.length < 1000) break;
  }
  return itens;
}

export async function gravarProcedimento(
  pacienteId: number, d: { data: string; tipo: string; obs: string },
): Promise<{ erro?: string }> {
  const u = await exigirUsuario();
  if (!u.perms.editar) return { erro: "Você não tem permissão para esta ação." };
  if (!dataOk(d.data)) return { erro: "Informe a data do procedimento." };
  if (d.data > hojeISO()) return { erro: "A data não pode ser futura." };
  if (!(PROCEDIMENTOS as readonly string[]).includes(d.tipo)) return { erro: "Selecione o procedimento." };
  const obs = d.obs.trim().slice(0, 1000);
  const sb = await supabaseServidor();
  const r = await sb.from("procedimentos").insert({ paciente_id: pacienteId, data: d.data, tipo: d.tipo, obs: obs || null });
  if (r.error) {
    console.error("[gravarProcedimento]", r.error.message);
    return { erro: "Não foi possível salvar. Tente novamente; se continuar, avise a coordenação." };
  }
  return {};
}

export async function removerProcedimentoDb(id: number) {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const r = await sb.rpc("remover_procedimento", { p_id: id });
  if (r.error) throw new Error(r.error.message);
}

/** Registra no histórico do paciente quem gerou um documento em PDF (não bloqueia se a função ainda não existir). */
export async function registrarDocumentoGerado(pacienteId: number, tipo: "relatorio" | "prescricao" | "prescricao_impressa") {
  const sb = await supabaseServidor();
  const r = await sb.rpc("registrar_documento", { p_id: pacienteId, p_tipo: tipo });
  if (r.error) console.error("[registrarDocumento]", r.error.message);
}
