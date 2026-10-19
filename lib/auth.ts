import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServidor } from "./supabase/servidor";

export type Usuario = { id: string; email: string; nome: string };

/** Exige sessão válida (verificada no Supabase); senão manda para o login. */
export const exigirUsuario = cache(async (): Promise<Usuario> => {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  const u = data.user;
  const email = u.email ?? "";
  return { id: u.id, email, nome: String(u.user_metadata?.nome ?? email) };
});
