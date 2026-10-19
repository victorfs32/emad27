import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServidor() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
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
