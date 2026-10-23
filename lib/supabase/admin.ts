import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Cliente com a chave de administração do Supabase (ignora as regras de acesso).
 * Só existe no servidor e só deve ser usado depois de confirmar que quem pede é administrador.
 * Retorna null quando a chave não está configurada.
 */
export function supabaseAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!chave || !SUPABASE_URL) return null;
  return createClient(SUPABASE_URL, chave, { auth: { autoRefreshToken: false, persistSession: false } });
}
