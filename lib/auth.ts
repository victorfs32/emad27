import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServidor } from "./supabase/servidor";
import { linhasCarimbo } from "./carimbo";
import { camposFaltando } from "./profissional";

export type Permissoes = { cadastrar: boolean; editar: boolean; exportar: boolean; prescrever: boolean; admin: boolean };
export type Usuario = { id: string; email: string; nome: string; cargo: string; registro: string; registroEspecialista: string; carimbo: string[]; cpf: string; cns: string; cbo: string; cnes: string; ine: string; cadastroPendente: string[]; perms: Permissoes };

/** Exige sessão válida e perfil ativo; senão manda para o login / tela de acesso desativado. */
export const exigirUsuario = cache(async (): Promise<Usuario> => {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  const u = data.user;

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, ativo, admin, pode_cadastrar, pode_editar, pode_exportar, pode_prescrever")
    .eq("user_id", u.id)
    .maybeSingle();
  if (!perfil || !perfil.ativo) redirect("/sem-acesso");

  // O carimbo vem em consulta à parte: se as colunas ainda não existirem, o login continua funcionando.
  const { data: extra } = await supabase
    .from("perfis")
    .select("cargo, registro, registro_especialista")
    .eq("user_id", u.id)
    .maybeSingle();

  // Identificação do profissional (v14): também em consulta à parte; sem as colunas, não há aviso de cadastro.
  const { data: ident, error: erroIdent } = await supabase
    .from("perfis")
    .select("cpf, cns, cbo, cnes, ine")
    .eq("user_id", u.id)
    .maybeSingle();
  const id = { cpf: ident?.cpf ?? "", cns: ident?.cns ?? "", cbo: ident?.cbo ?? "", cnes: ident?.cnes ?? "", ine: ident?.ine ?? "" };

  return {
    id: u.id,
    email: u.email ?? "",
    nome: perfil.nome,
    cargo: extra?.cargo ?? "",
    registro: extra?.registro ?? "",
    registroEspecialista: extra?.registro_especialista ?? "",
    carimbo: linhasCarimbo({ nome: perfil.nome, ...extra }),
    ...id,
    cadastroPendente: erroIdent ? [] : camposFaltando(id),
    perms: {
      admin: perfil.admin,
      cadastrar: perfil.admin || perfil.pode_cadastrar,
      editar: perfil.admin || perfil.pode_editar,
      exportar: perfil.admin || perfil.pode_exportar,
      prescrever: perfil.admin || perfil.pode_prescrever,
    },
  };
});

export async function exigirPermissao(p: keyof Permissoes): Promise<Usuario> {
  const u = await exigirUsuario();
  if (!u.perms[p]) redirect("/?erro=permissao");
  return u;
}
