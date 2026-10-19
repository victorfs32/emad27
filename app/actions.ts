"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPermissao, exigirUsuario } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";
import {
  adicionarEvolucao, buscarCid, gravarProcedimento, registrarVisita as gravarVisita, removerProcedimentoDb, removerRegistro, gravarDispositivo, removerDispositivo, trocarDispositivo, definirProximaVisita, gravarPaciente, obterFicha, reAdmitir, salvarPerfil,
  type Perfil,
} from "@/lib/pacientes";
import type { DadosForm, ResultadoSalvar } from "@/lib/formulario";
import { TIPOS_EVOLUCAO, hojeISO } from "@/lib/opcoes";

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
  const p: Omit<Perfil, "user_id"> = {
    nome: String(fd.get("nome") ?? "").trim().slice(0, 120) || "Sem nome",
    ativo: marcado("ativo"),
    admin: marcado("admin"),
    pode_cadastrar: marcado("pode_cadastrar"),
    pode_editar: marcado("pode_editar"),
    pode_exportar: marcado("pode_exportar"),
  };
  // Evita o administrador se trancar para fora do sistema.
  if (userId === eu.id) {
    p.ativo = true;
    p.admin = true;
  }
  await salvarPerfil(userId, p);
  revalidatePath("/equipe");
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
