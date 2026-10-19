-- Execute no SQL Editor do Supabase (projeto que já tem o schema.sql aplicado).
-- Adiciona: lesão por pressão (LPP) e próxima visita programada.

alter table public.pacientes add column if not exists possui_lpp boolean not null default false;
alter table public.pacientes add column if not exists proxima_visita date;

drop view if exists public.pacientes_resumo;
create view public.pacientes_resumo with (security_invoker = true) as
select p.id, p.nome, p.data_nascimento, p.bairro, p.diagnostico, p.modalidade, p.status, p.telefone,
       p.cpf, p.cns, p.possui_lpp, p.proxima_visita,
       (select max(e.data) from public.evolucoes e where e.paciente_id = p.id) as ultima_evolucao
from public.pacientes p;

revoke all on public.pacientes_resumo from anon;
