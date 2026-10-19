# EMAD 27 — Melhor em Casa

Cadastro e acompanhamento de pacientes (acesso restrito). Next.js + Supabase (Postgres + Auth).

## Configuração

1. Crie um projeto no [Supabase](https://supabase.com).
2. **SQL Editor** → cole e execute `supabase/schema.sql` (tabelas, RLS e view).
3. **Authentication → Sign In / Providers**: desligue "Allow new users to sign up".
4. **Authentication → Users → Add user**: crie cada profissional (e-mail + senha). Para exibir o nome nos registros, edite o usuário e coloque em *user metadata*: `{"nome": "Maria Silva — Enfermeira"}`.
5. Copie `.env.example` para `.env.local` e preencha URL e chave publishable (Project Settings → API).
6. `npm install` e `npm run dev`.
