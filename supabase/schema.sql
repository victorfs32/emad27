-- EMAD 27 — Melhor em Casa
-- Execute no Supabase: SQL Editor > New query > colar > Run.

create table if not exists public.pacientes (
  id bigint generated always as identity primary key,
  nome text not null,
  data_nascimento date,
  sexo text check (sexo in ('F','M','O')),
  cpf text,
  cns text,
  telefone text,
  contato_nome text,
  contato_telefone text,
  endereco text,
  bairro text,
  municipio text,
  referencia text,
  diagnostico text,
  cid text,
  origem text,
  modalidade text check (modalidade in ('AD1','AD2','AD3')),
  data_admissao date,
  status text not null default 'ativo' check (status in ('ativo','internado','suspenso','alta','obito')),
  data_saida date,
  motivo_saida text,
  dispositivos text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid default auth.uid() references auth.users(id) on delete set null
);
create index if not exists idx_pacientes_nome on public.pacientes (nome);
create index if not exists idx_pacientes_status on public.pacientes (status);

create table if not exists public.evolucoes (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  data date not null,
  tipo text not null,
  texto text not null,
  autor text not null,
  usuario_id uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_evolucoes_paciente on public.evolucoes (paciente_id, data desc);

-- Lista com a data da última evolução (respeita o RLS de quem consulta).
create or replace view public.pacientes_resumo with (security_invoker = true) as
select p.id, p.nome, p.data_nascimento, p.bairro, p.diagnostico, p.modalidade, p.status, p.telefone,
       p.cpf, p.cns,
       (select max(e.data) from public.evolucoes e where e.paciente_id = p.id) as ultima_evolucao
from public.pacientes p;

-- Acesso restrito: somente usuários autenticados (equipe) leem e gravam.
-- IMPORTANTE: desative o cadastro público em Authentication > Sign In / Providers
-- ("Allow new users to sign up" desligado) e crie os usuários manualmente.
alter table public.pacientes enable row level security;
alter table public.evolucoes enable row level security;

drop policy if exists equipe_pacientes on public.pacientes;
create policy equipe_pacientes on public.pacientes
  for all to authenticated using (true) with check (true);

drop policy if exists equipe_evolucoes on public.evolucoes;
create policy equipe_evolucoes on public.evolucoes
  for all to authenticated using (true) with check (true);

revoke all on public.pacientes, public.evolucoes, public.pacientes_resumo from anon;
