import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServidor } from "./supabase/servidor";

export type Permissoes = { cadastrar: boolean; editar: boolean; exportar: boolean; admin: boolean };
export type Usuario = { id: string; email: string; nome: string; perms: Permissoes };

/** Exige sessão válida e perfil ativo; senão manda para o login / tela de acesso desativado. */
export const exigirUsuario = cache(async (): Promise<Usuario> => {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  const u = data.user;

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, ativo, admin, pode_cadastrar, pode_editar, pode_exportar")
    .eq("user_id", u.id)
    .maybeSingle();
  if (!perfil || !perfil.ativo) redirect("/sem-acesso");

  return {
    id: u.id,
    email: u.email ?? "",
    nome: perfil.nome,
    perms: {
      admin: perfil.admin,
      cadastrar: perfil.admin || perfil.pode_cadastrar,
      editar: perfil.admin || perfil.pode_editar,
      exportar: perfil.admin || perfil.pode_exportar,
    },
  };
});

export async function exigirPermissao(p: keyof Permissoes): Promise<Usuario> {
  const u = await exigirUsuario();
  if (!u.perms[p]) redirect("/?erro=permissao");
  return u;
}
