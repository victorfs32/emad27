# EMAD 27 — Melhor em Casa

Cadastro e acompanhamento de pacientes (acesso restrito). Next.js + Supabase (Postgres + Auth).

## Configuração

1. Crie um projeto no [Supabase](https://supabase.com).
2. **SQL Editor** → cole e execute `supabase/schema.sql` (pode ser repetido; não apaga dados).
3. **Authentication → Sign In / Providers**: desligue "Allow new users to sign up".
4. Primeiro acesso: crie o primeiro usuário em **Authentication → Users → Add user** (e-mail + senha, "Auto Confirm User"); ele vira administrador. Os demais são cadastrados pelo próprio site, em **Equipe → Cadastrar novo usuário** (por padrão só visualizam; administradores cadastram e alteram tudo).
5. Variáveis de ambiente (Vercel ou `.env.local`): `SUPABASE_URL` e `SUPABASE_ANON_KEY` (ou `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Veja `.env.example`. Para cadastrar usuários pelo site, defina também `SUPABASE_SERVICE_ROLE_KEY` (chave de administração, **somente no servidor**; nunca com prefixo `NEXT_PUBLIC_`).
6. `npm install` e `npm run dev`.

## Segurança

- Todo acesso passa por login individual; as regras de acesso (RLS) ficam no banco.
- Gravações em pacientes só ocorrem por funções do banco que checam a permissão e registram o histórico (quem, quando, de/para).
- Pacientes com alta, transferidos ou óbito ficam em **Arquivados**, nunca são apagados.
- Faça cópias de segurança: plano Pro do Supabase (backups diários) ou exportações periódicas.
