"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";
import {
  adicionarEvolucao, atualizarPaciente, criarPaciente, definirProximaVisita, lerFormulario, obterPaciente,
  type DadosPaciente,
} from "@/lib/pacientes";
import { TIPOS_EVOLUCAO } from "@/lib/opcoes";

export type EstadoLogin = { erro?: string };
export type EstadoPaciente = { erro?: string; valores?: DadosPaciente };

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

export async function salvarPaciente(id: number | null, _: EstadoPaciente, fd: FormData): Promise<EstadoPaciente> {
  await exigirUsuario();
  const { dados, erro } = lerFormulario(fd);
  if (erro) return { erro, valores: dados };

  if (id === null) {
    redirect(`/pacientes/${await criarPaciente(dados)}`);
  }
  if (!(await obterPaciente(id))) redirect("/");
  await atualizarPaciente(id, dados);
  revalidatePath("/");
  redirect(`/pacientes/${id}`);
}

export async function agendarVisita(pacienteId: number, fd: FormData) {
  await exigirUsuario();
  const data = String(fd.get("proxima_visita") ?? "");
  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
  if (!(await obterPaciente(pacienteId))) return;
  await definirProximaVisita(pacienteId, data || null);
  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/proximas-visitas");
}

export async function registrarEvolucao(pacienteId: number, fd: FormData) {
  await exigirUsuario();
  const texto = String(fd.get("texto") ?? "").trim().slice(0, 5000);
  const tipo = String(fd.get("tipo") ?? "");
  const data = String(fd.get("data") ?? "");
  if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !(TIPOS_EVOLUCAO as readonly string[]).includes(tipo)) return;
  if (!(await obterPaciente(pacienteId))) return;
  await adicionarEvolucao(pacienteId, { data, tipo, texto });
  revalidatePath(`/pacientes/${pacienteId}`);
}
