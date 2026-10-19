// O Supabase só é usado no servidor (Server Components, Actions e proxy), então
// aceitamos tanto os nomes criados pela integração da Vercel (SUPABASE_*) quanto
// os nomes com prefixo NEXT_PUBLIC_*. Só valores públicos (URL e chave publishable/anon).
export const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!;
export const SUPABASE_CHAVE = (process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
