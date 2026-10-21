import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_CHAVE, SUPABASE_URL } from "./env";

export async function supabaseServidor() {
  const store = await cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_CHAVE,
    {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
      cookies: {
        getAll: () => store.getAll(),
        setAll(lista) {
          try {
            for (const { name, value, options } of lista) store.set(name, value, options);
          } catch {
            // Chamado a partir de Server Component: a renovação é feita pelo proxy.
          }
        },
      },
    },
  );
}
