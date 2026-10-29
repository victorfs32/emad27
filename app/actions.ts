"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPermissao, exigirUsuario } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";
import {
  adicionarEvolucao, buscarCid, listarEvolucoes, listarProcedimentos, registrarDocumentoGerado, gravarProcedimento, registrarVisita as gravarVisita, removerProcedimentoDb, removerRegistro, gravarDispositivo, removerDispositivo, trocarDispositivo, definirProximaVisita, gravarPaciente, obterFicha, reAdmitir, salvarPerfil,
  type Perfil,
} from "@/lib/pacientes";
import { criarUsuario, trocarSenhaPropria, type DadosNovoUsuario } from "@/lib/usuarios";
import { problemaNaIdentificacao, type IdentificacaoProfissional } from "@/lib/profissional";
import type { DadosForm, ResultadoSalvar } from "@/lib/formulario";
import { TIPOS_EVOLUCAO, TIPO_VISITA, hojeISO } from "@/lib/opcoes";
import type { DadosRelatorio } from "@/lib/relatorio-pdf";
import type { DadosPrescricao } from "@/lib/prescricao-pdf";
import { gravarPrescricao, obterPrescricao, removerPrescricaoDb } from "@/lib/prescricoes";
import type { FichaParaDocumento } from "@/lib/documento-util";
import { formatarCep, formatarCns, formatarCpf, formatarTelefone } from "@/lib/validacao";
import type { DadosDietaEnteral } from "@/lib/dieta-enteral-pdf";
import { VIAS_DIETA, calcularIdade, formatarData } from "@/lib/opcoes";
import type { DadosCapa } from "@/lib/capa-pdf";
import type { DadosFormPrescricao } from "@/lib/prescricao-tipos";

export type EstadoLogin = { erro?: string };

export async function entrar(_: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  const email = String(fd.get("email") ?? "").trim();
  const senha = String(fd.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha." };
  const sb = await supabaseServidor();
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha incorretos." };
  redirect("/");
}

export async function sair() {
  const sb = await supabaseServidor();
  await sb.auth.signOut();
  redirect("/login");
}

/** Cria (id = null) ou atualiza o paciente. Em caso de sucesso, redireciona para a ficha. */
export async function salvarPaciente(
  id: number | null, dados: DadosForm, confirmarDuplicado: boolean,
): Promise<ResultadoSalvar> {
  await exigirPermissao(id === null ? "cadastrar" : "editar");
  const r = await gravarPaciente(id, dados, confirmarDuplicado);
  if (r.erro || r.duplicados) return { erro: r.erro, duplicados: r.duplicados };
  revalidatePath("/", "layout");
  redirect(`/pacientes/${r.id}`);
}

export async function agendarVisita(pacienteId: number, fd: FormData) {
  await exigirPermissao("editar");
  const data = String(fd.get("proxima_visita") ?? "");
  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
  await definirProximaVisita(pacienteId, data || null);
  revalidatePath("/", "layout");
}

export async function novaAdmissao(pacienteId: number, fd: FormData) {
  await exigirPermissao("editar");
  const data = String(fd.get("data") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
  if (!(await obterFicha(pacienteId))) return;
  await reAdmitir(pacienteId, data);
  revalidatePath("/", "layout");
  redirect(`/pacientes/${pacienteId}?aba=acompanhamento`);
}

export async function registrarEvolucao(pacienteId: number, fd: FormData) {
  await exigirPermissao("editar");
  const texto = String(fd.get("texto") ?? "").trim().slice(0, 5000);
  const tipo = String(fd.get("tipo") ?? "");
  const data = String(fd.get("data") ?? "");
  if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !(TIPOS_EVOLUCAO as readonly string[]).includes(tipo)) return;
  await adicionarEvolucao(pacienteId, { data, tipo, texto });
  revalidatePath(`/pacientes/${pacienteId}`);
}

export async function pesquisarCid(termo: string) {
  await exigirUsuario();
  return buscarCid(termo);
}

export async function atualizarPerfil(userId: string, fd: FormData) {
  const eu = await exigirPermissao("admin");
  const marcado = (k: string) => fd.get(k) === "on";
  const perfil = String(fd.get("perfil") ?? "personalizado");
  const todos = perfil === "admin";
  const nenhum = perfil === "visualizacao";
  const p: Omit<Perfil, "user_id"> = {
    nome: String(fd.get("nome") ?? "").trim().slice(0, 120) || "Sem nome",
    ativo: marcado("ativo"),
    // "Administrador" e "Somente visualização" definem tudo de uma vez; "Personalizado" usa as caixas.
    admin: todos || (!nenhum && marcado("admin")),
    pode_cadastrar: todos || (!nenhum && marcado("pode_cadastrar")),
    pode_editar: todos || (!nenhum && marcado("pode_editar")),
    pode_exportar: todos || (!nenhum && marcado("pode_exportar")),
    pode_prescrever: todos || (!nenhum && marcado("pode_prescrever")),
  };
  // Evita o administrador se trancar para fora do sistema: o próprio usuário continua ativo e administrador.
  if (userId === eu.id) {
    p.ativo = true;
    p.admin = true;
    p.pode_cadastrar = true;
    p.pode_editar = true;
    p.pode_exportar = true;
    p.pode_prescrever = true;
  }
  await salvarPerfil(userId, p);
  revalidatePath("/equipe");
}

export type ResultadoNovoUsuario = { erro?: string; ok?: boolean };

/** Cadastra um novo login (só administradores). Por padrão o usuário só consulta. */
export async function cadastrarUsuario(
  dados: DadosNovoUsuario,
): Promise<ResultadoNovoUsuario> {
  await exigirPermissao("admin");
  const r = await criarUsuario(dados);
  if (r.erro) return r;
  revalidatePath("/equipe");
  return { ok: true };
}

export async function alterarMinhaSenha(
  dados: { atual: string; nova: string; confirmar: string },
): Promise<{ erro?: string; ok?: boolean }> {
  await exigirUsuario();
  if (dados.nova !== dados.confirmar) return { erro: "A confirmação não é igual à nova senha." };
  const r = await trocarSenhaPropria(dados.atual, dados.nova);
  return r.erro ? r : { ok: true };
}

export type ResultadoDispositivo = { erro?: string; ok?: boolean };

export async function salvarDispositivo(
  id: number | null, pacienteId: number,
  dados: { tipo: string; numero: string; confeccao: string; troca: string; proxima_troca: string; obs: string },
): Promise<ResultadoDispositivo> {
  await exigirPermissao("editar");
  if (!Number.isSafeInteger(pacienteId)) return { erro: "Selecione o paciente." };
  const r = await gravarDispositivo(id, pacienteId, dados);
  if (r.erro) return r;
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function registrarTroca(id: number, fd: FormData) {
  await exigirPermissao("editar");
  const data = String(fd.get("data") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
  await trocarDispositivo(id, data);
  revalidatePath("/", "layout");
}

export async function excluirDispositivo(id: number) {
  await exigirPermissao("editar");
  await removerDispositivo(id);
  revalidatePath("/", "layout");
}

/** Registra uma visita domiciliar (conta no controle de visitas do mês e entra no acompanhamento da ficha). */
export async function salvarVisita(pacienteId: number, data: string, nota: string): Promise<{ erro?: string }> {
  await exigirPermissao("editar");
  if (!Number.isSafeInteger(pacienteId)) return { erro: "Escolha o paciente." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Informe a data da visita." };
  if (data > hojeISO()) return { erro: "Não é possível registrar visita em data futura." };
  const r = await gravarVisita(pacienteId, data, nota.slice(0, 1000));
  if (r.erro) return r;
  revalidatePath("/", "layout");
  return {};
}

/** Clique num dia da grade: registra a visita daquele dia. */
export async function registrarVisitaDia(pacienteId: number, data: string): Promise<{ erro?: string }> {
  return salvarVisita(pacienteId, data, "");
}

export async function desfazerRegistro(id: number) {
  await exigirPermissao("editar");
  await removerRegistro(id);
  revalidatePath("/", "layout");
}

export type ResultadoProcedimento = { erro?: string; ok?: boolean };

export async function salvarProcedimento(
  pacienteId: number, dados: { data: string; tipo: string; obs: string },
): Promise<ResultadoProcedimento> {
  await exigirPermissao("editar");
  if (!Number.isSafeInteger(pacienteId)) return { erro: "Selecione o paciente." };
  const r = await gravarProcedimento(pacienteId, dados);
  if (r.erro) return r;
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function excluirProcedimento(id: number) {
  await exigirPermissao("editar");
  await removerProcedimentoDb(id);
  revalidatePath("/", "layout");
}

/** Reúne os dados do paciente para o relatório em PDF (montado no navegador). Exige permissão de exportar. */
export async function dadosRelatorio(pacienteId: number): Promise<{ erro?: string; dados?: DadosRelatorio }> {
  const eu = await exigirPermissao("exportar");
  if (!Number.isSafeInteger(pacienteId)) return { erro: "Paciente inválido." };
  const ficha = await obterFicha(pacienteId);
  if (!ficha) return { erro: "Paciente não encontrado." };

  const [evolucoes, procedimentos] = await Promise.all([listarEvolucoes(pacienteId), listarProcedimentos({ pacienteId })]);
  const hoje = hojeISO();
  const mes = hoje.slice(0, 7);
  const visitas = evolucoes.filter((e) => e.tipo === TIPO_VISITA);
  const procedimentosPorTipo: Record<string, number> = {};
  for (const p of procedimentos) procedimentosPorTipo[p.tipo] = (procedimentosPorTipo[p.tipo] ?? 0) + 1;

  await registrarDocumentoGerado(pacienteId, "relatorio");

  return {
    dados: {
      geradoEm: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }),
      geradoPor: eu.nome,
      hoje,
      ficha,
      evolucoes: evolucoes.slice(0, 12).map((e) => ({ data: e.data, tipo: e.tipo, texto: e.texto, autor: e.autor })),
      totalEvolucoes: evolucoes.length,
      procedimentos: procedimentos.slice(0, 20).map((p) => ({ data: p.data, tipo: p.tipo, obs: p.obs, autor: p.autor })),
      procedimentosPorTipo,
      procedimentosMes: procedimentos.filter((p) => p.data.startsWith(mes)).length,
      visitasMes: visitas.filter((e) => e.data.startsWith(mes)).length,
      visitasTotal: visitas.length,
      ultimaVisita: visitas[0]?.data ?? null,
    },
  };
}

/** Dados do paciente para o formulário de prescrição médica (montado no navegador). Exige permissão de exportar. */
export async function dadosPrescricao(pacienteId: number): Promise<{ erro?: string; dados?: DadosPrescricao }> {
  const eu = await exigirPermissao("exportar");
  if (!Number.isSafeInteger(pacienteId)) return { erro: "Paciente inválido." };
  const ficha = await obterFicha(pacienteId);
  if (!ficha) return { erro: "Paciente não encontrado." };
  await registrarDocumentoGerado(pacienteId, "prescricao");
  return {
    dados: {
      ficha,
      geradoPor: eu.nome,
      carimbo: { linhas: eu.carimbo, enfermagem: /enferm/i.test(eu.cargo) },
      hoje: hojeISO(),
      geradoEm: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }),
    },
  };
}

/** Salva (nova ou existente) a prescrição digitada. Só quem tem a permissão "Prescrever". */
export async function salvarPrescricao(
  id: number | null, pacienteId: number, dados: DadosFormPrescricao,
): Promise<{ erro: string } | never> {
  await exigirPermissao("prescrever");
  if (!Number.isSafeInteger(pacienteId) || (id !== null && !Number.isSafeInteger(id))) return { erro: "Prescrição inválida." };
  const r = await gravarPrescricao(id, pacienteId, dados);
  if (r.erro) return { erro: r.erro };
  revalidatePath("/", "layout");
  redirect(`/prescricoes?paciente=${pacienteId}`);
}

export async function excluirPrescricao(id: number): Promise<{ erro?: string }> {
  await exigirPermissao("prescrever");
  if (!Number.isSafeInteger(id)) return { erro: "Prescrição inválida." };
  const r = await removerPrescricaoDb(id);
  if (!r.erro) revalidatePath("/", "layout");
  return r;
}

/** Dados para imprimir uma prescrição digitada já preenchida no formulário. */
export async function dadosPrescricaoSalva(prescricaoId: number): Promise<{ erro?: string; dados?: DadosPrescricao }> {
  const eu = await exigirPermissao("exportar");
  if (!Number.isSafeInteger(prescricaoId)) return { erro: "Prescrição inválida." };
  const presc = await obterPrescricao(prescricaoId);
  if (!presc) return { erro: "Prescrição não encontrada." };
  const ficha = await obterFicha(presc.paciente_id);
  if (!ficha) return { erro: "Paciente não encontrado." };
  await registrarDocumentoGerado(presc.paciente_id, "prescricao_impressa");
  return {
    dados: {
      ficha,
      geradoPor: eu.nome,
      carimbo: { linhas: eu.carimbo, enfermagem: /enferm/i.test(eu.cargo) },
      hoje: hojeISO(),
      geradoEm: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }),
      prescricao: {
        data: presc.data,
        datas_aprazamento: presc.datas_aprazamento,
        itens: presc.itens,
        observacoes: presc.observacoes ?? "",
        autor: presc.autor,
      },
    },
  };
}

/** Nome do paciente para o receituário médico; registra a geração no histórico. Exige "Prescrever". */
export async function dadosReceituario(pacienteId: number): Promise<{ erro?: string; nome?: string; hoje?: string }> {
  await exigirPermissao("prescrever");
  if (!Number.isSafeInteger(pacienteId)) return { erro: "Paciente inválido." };
  const ficha = await obterFicha(pacienteId);
  if (!ficha) return { erro: "Paciente não encontrado." };
  await registrarDocumentoGerado(pacienteId, "doc_receituario_medico");
  return { nome: ficha.nome, hoje: hojeISO() };
}

/** Dados do requerimento de dieta enteral, todos tirados do cadastro. Exige exportar. */
export async function dadosDietaEnteral(pacienteId: number): Promise<{ erro?: string; dados?: DadosDietaEnteral }> {
  await exigirPermissao("exportar");
  if (!Number.isSafeInteger(pacienteId)) return { erro: "Paciente inválido." };
  const f = await obterFicha(pacienteId);
  if (!f) return { erro: "Paciente não encontrado." };
  const diagnostico = [...f.diagnosticos].sort((a, b) => Number(b.principal) - Number(a.principal))
    .map((x) => (x.descricao ? `${x.cid} - ${x.descricao}` : x.cid)).join("; ");
  const via = f.dieta_vias
    .filter((v) => v !== "oral" || f.dieta_vias.length === 1)
    .map((v) => (v === "outra" ? (f.dieta_outra ?? "") : (VIAS_DIETA.find((x) => x.valor === v)?.rotulo ?? v).toLowerCase()))
    .filter(Boolean).join(" e ");
  await registrarDocumentoGerado(pacienteId, "doc_dieta_enteral");
  return { dados: { nome: f.nome, nascimento: f.data_nascimento ?? "", cns: f.cns ? formatarCns(f.cns) : "", diagnostico, via, data: hojeISO() } };
}

/** Dados da capa do prontuário domiciliar, todos tirados do cadastro. Exige exportar. */
export async function dadosCapa(pacienteId: number): Promise<{ erro?: string; dados?: DadosCapa }> {
  await exigirPermissao("exportar");
  if (!Number.isSafeInteger(pacienteId)) return { erro: "Paciente inválido." };
  const f = await obterFicha(pacienteId);
  if (!f) return { erro: "Paciente não encontrado." };
  const data = (iso: string | null) => (iso ? formatarData(iso) : "");
  const idade = calcularIdade(f.data_nascimento);
  const cuidador = f.cuidadores.find((c) => c.principal) ?? f.cuidadores[0];
  const doPaciente = f.telefones.filter((t) => t.de_quem === "paciente");
  const telefonesPaciente = (doPaciente.length ? doPaciente : f.telefones).slice(0, 2).map((t) => formatarTelefone(t.numero));
  const telefonesCuidador = [cuidador?.telefone ?? "", ...f.telefones.filter((t) => t.de_quem !== "paciente").map((t) => t.numero)]
    .map((t) => formatarTelefone(t))
    .filter((t, i, todos) => t && todos.indexOf(t) === i)
    .slice(0, 2);
  await registrarDocumentoGerado(pacienteId, "doc_capa");
  return {
    dados: {
      emad: "27",
      admissao: data(f.admissao),
      prontuario: f.prontuario,
      nome: f.nome,
      nomeSocial: f.nome_social ?? "",
      cpf: f.cpf ? formatarCpf(f.cpf) : "",
      rg: f.rg ?? "",
      mae: f.nome_mae ?? "",
      pai: f.nome_pai ?? "",
      cns: f.cns ? formatarCns(f.cns) : "",
      idade: idade === null ? "" : `${idade} anos`,
      nascimento: data(f.data_nascimento),
      bairro: f.bairro ?? "",
      logradouro: [f.rua, f.complemento].filter(Boolean).join(", "),
      numero: f.numero ?? "",
      referencia: f.referencia ?? "",
      telefones: telefonesPaciente.join(" / "),
      cuidador: cuidador?.nome ?? "",
      cuidadorNomeSocial: cuidador?.nome_social ?? "",
      cuidadorCpf: cuidador?.cpf ? formatarCpf(cuidador.cpf) : "",
      cuidadorRg: cuidador?.rg ?? "",
      cuidadorCns: cuidador?.cns ? formatarCns(cuidador.cns) : "",
      cuidadorNascimento: data(cuidador?.data_nascimento ?? null),
      cuidadorTelefones: telefonesCuidador,
      uaps: f.uaps?.nome ?? "",
      acs: f.acs ?? "",
      alta: f.situacao === "alta" ? data(f.situacao_data) : "",
    },
  };
}

export type CadastroDocumento = { nome: string; cns: string; nascimento: string; sexo: string; idade: string; diagnostico: string; mae: string; endereco: string; hoje: string };

/** Dados do cadastro para documentos que o médico completa na tela (antimicrobiano, fraldas). Exige "Prescrever". */
export async function dadosCadastroDocumento(
  tipo: "antimicrobiano" | "fraldas" | "exames", pacienteId: number,
): Promise<{ erro?: string; dados?: CadastroDocumento }> {
  await exigirPermissao("prescrever");
  if (tipo !== "antimicrobiano" && tipo !== "fraldas" && tipo !== "exames") return { erro: "Documento inválido." };
  if (!Number.isSafeInteger(pacienteId)) return { erro: "Paciente inválido." };
  const f = await obterFicha(pacienteId);
  if (!f) return { erro: "Paciente não encontrado." };
  const idade = calcularIdade(f.data_nascimento);
  const diagnostico = [...f.diagnosticos].sort((a, b) => Number(b.principal) - Number(a.principal))
    .map((x) => (x.descricao ? `${x.cid} - ${x.descricao}` : x.cid)).join("; ");
  await registrarDocumentoGerado(pacienteId, tipo === "fraldas" ? "doc_fraldas" : tipo === "exames" ? "doc_exames" : "doc_antimicrobiano");
  const via = [f.rua, f.numero ? `nº ${f.numero}` : "", f.complemento].filter(Boolean).join(", ");
  const local = [f.bairro, f.municipio].filter(Boolean).join(" - ");
  const endereco = [[via, local].filter(Boolean).join(", "), f.cep ? `CEP ${formatarCep(f.cep)}` : ""].filter(Boolean).join("  ");
  return {
    dados: {
      nome: f.nome, cns: f.cns ? formatarCns(f.cns) : "", nascimento: f.data_nascimento ?? "", sexo: f.sexo ?? "",
      idade: idade === null ? "" : `${idade} anos`, diagnostico, mae: f.nome_mae ?? "", endereco, hoje: hojeISO(),
    },
  };
}

const TIPOS_DOC_FICHA = {
  controle_especial: "doc_receituario_controle_especial",
  medicamentos_especiais: "doc_medicamentos_especiais",
  elegibilidade_admissao: "doc_elegibilidade_admissao",
  iaec_ad: "doc_iaec_d",
} as const;

/** Ficha completa do paciente para formulários que o médico completa na tela. Exige "Prescrever". */
export async function fichaParaDocumento(
  tipo: keyof typeof TIPOS_DOC_FICHA, pacienteId: number,
): Promise<{ erro?: string; dados?: FichaParaDocumento }> {
  const eu = await exigirPermissao("prescrever");
  if (!(tipo in TIPOS_DOC_FICHA)) return { erro: "Documento inválido." };
  if (!Number.isSafeInteger(pacienteId)) return { erro: "Paciente inválido." };
  const ficha = await obterFicha(pacienteId);
  if (!ficha) return { erro: "Paciente não encontrado." };
  await registrarDocumentoGerado(pacienteId, TIPOS_DOC_FICHA[tipo]);
  return { dados: { ficha, medico: eu.nome, hoje: hojeISO() } };
}

/** Nome do paciente para o atestado médico; registra a geração no histórico. Exige "Prescrever". */
export async function dadosAtestado(pacienteId: number): Promise<{ erro?: string; nome?: string }> {
  await exigirPermissao("prescrever");
  if (!Number.isSafeInteger(pacienteId)) return { erro: "Paciente inválido." };
  const ficha = await obterFicha(pacienteId);
  if (!ficha) return { erro: "Paciente não encontrado." };
  await registrarDocumentoGerado(pacienteId, "doc_atestado");
  return { nome: ficha.nome };
}

/** Salva o carimbo (cargo, conselho e registro de especialista) do próprio usuário. */
export async function salvarCarimbo(cargo: string, registro: string, especialista: string): Promise<{ erro?: string }> {
  await exigirUsuario();
  const sb = await supabaseServidor();
  const r = await sb.rpc("atualizar_meu_carimbo", { p_cargo: cargo, p_registro: registro, p_especialista: especialista });
  if (r.error) {
    console.error("[salvarCarimbo]", r.error.code ?? r.error.message);
    return { erro: "Não foi possível salvar. Confira o tamanho dos textos e tente novamente." };
  }
  revalidatePath("/", "layout");
  return {};
}

/** Atualiza o próprio nome e a identificação profissional (CPF, CNS, CBO, CNES, INE). */
export async function salvarMeuCadastro(nome: string, ident: IdentificacaoProfissional): Promise<{ erro?: string }> {
  await exigirUsuario();
  const problema = problemaNaIdentificacao(ident);
  if (problema) return { erro: problema };
  if (nome.trim().length < 2) return { erro: "Informe o seu nome." };
  const sb = await supabaseServidor();
  const r = await sb.rpc("atualizar_meu_cadastro", { p_nome: nome, p_cpf: ident.cpf, p_cns: ident.cns, p_cbo: ident.cbo, p_cnes: ident.cnes, p_ine: ident.ine });
  if (r.error) {
    console.error("[salvarMeuCadastro]", r.error.code ?? r.error.message);
    return { erro: "Não foi possível salvar. Confira os números e tente novamente." };
  }
  revalidatePath("/", "layout");
  return {};
}
