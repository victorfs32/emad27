// A integração Supabase da Vercel cria NEXT_PUBLIC_SUPABASE_ANON_KEY;
// projetos novos usam NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Aceitamos as duas.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_CHAVE =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
