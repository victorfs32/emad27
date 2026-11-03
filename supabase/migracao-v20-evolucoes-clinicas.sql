-- EMAD 27 — versão 20: evolução clínica (médica e de enfermagem), registrada digitalmente e sem alteração posterior.
-- Execute no Supabase: SQL Editor > New query > colar > Run. Pode ser repetido; não apaga dados.
-- (O mesmo bloco também está em schema.sql.)

create table if not exists public.evolucoes_clinicas (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  data_hora timestamptz not null default now(),
  categoria text not null check (categoria in ('medica','enfermagem')),
  pa text, fc text, fr text, temperatura text, spo2 text, glicemia text, dor smallint check (dor between 0 and 10),
  evolucao text not null,
  conduta text,
  usuario_id uuid not null default auth.uid(),
  autor text not null,
  autor_cargo text,
  autor_registro text,
  criado_em timestamptz not null default now()
);
create index if not exists ix_evoc_pac on public.evolucoes_clinicas (paciente_id, data_hora desc);
alter table public.evolucoes_clinicas enable row level security;
drop policy if exists ver_evolucoes_clinicas on public.evolucoes_clinicas;
create policy ver_evolucoes_clinicas on public.evolucoes_clinicas for select to authenticated using (public.perm('ver'));
revoke all on public.evolucoes_clinicas from anon;

-- Médico(a) ou enfermeiro(a), pelo cargo do carimbo (técnicos de enfermagem não evoluem aqui).
create or replace function public.categoria_evolucao(p_cargo text) returns text
language sql immutable set search_path = public as $$
  select case
    when p_cargo is null or lower(p_cargo) like '%técnic%' or lower(p_cargo) like '%tecnic%' then null
    when lower(p_cargo) like '%médic%' or lower(p_cargo) like '%medic%' then 'medica'
    when lower(p_cargo) like '%enfermeir%' then 'enfermagem'
    else null end
$$;

create or replace function public.registrar_evolucao_clinica(p_paciente bigint, p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; eu public.perfis; v_cat text; v_dor smallint;
begin
  if not public.perm('ver') then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into eu from public.perfis where user_id = auth.uid();
  v_cat := public.categoria_evolucao(eu.cargo);
  if v_cat is null then
    raise exception 'Somente médicos e enfermeiros registram evolução. Confira o cargo em Conta.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.pacientes where id = p_paciente) then raise exception 'Paciente não encontrado.'; end if;
  if length(trim(coalesce(p ->> 'evolucao', ''))) < 3 then raise exception 'Escreva a evolução.'; end if;
  if length(p ->> 'evolucao') > 8000 or length(coalesce(p ->> 'conduta', '')) > 4000 then raise exception 'Texto longo demais.'; end if;
  v_dor := nullif(p ->> 'dor', '')::smallint;
  if nullif(p ->> 'data_hora', '')::timestamptz > now() + interval '5 minutes' then raise exception 'A data da evolução não pode ser futura.'; end if;
  insert into public.evolucoes_clinicas
    (paciente_id, data_hora, categoria, pa, fc, fr, temperatura, spo2, glicemia, dor, evolucao, conduta, autor, autor_cargo, autor_registro)
  values (
    p_paciente, coalesce(nullif(p ->> 'data_hora', '')::timestamptz, now()), v_cat,
    left(nullif(trim(p ->> 'pa'), ''), 20), left(nullif(trim(p ->> 'fc'), ''), 10), left(nullif(trim(p ->> 'fr'), ''), 10),
    left(nullif(trim(p ->> 'temperatura'), ''), 10), left(nullif(trim(p ->> 'spo2'), ''), 10), left(nullif(trim(p ->> 'glicemia'), ''), 10),
    v_dor, trim(p ->> 'evolucao'), nullif(trim(p ->> 'conduta'), ''), eu.nome, eu.cargo, eu.registro
  ) returning id into v_id;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (p_paciente, auth.uid(), eu.nome, 'evolucao',
          case v_cat when 'medica' then 'Evolução médica registrada' else 'Evolução de enfermagem registrada' end,
          jsonb_build_object('evolucao_id', v_id));
  return v_id;
end $$;

revoke execute on function public.registrar_evolucao_clinica(bigint, jsonb), public.categoria_evolucao(text) from public, anon;
grant execute on function public.registrar_evolucao_clinica(bigint, jsonb), public.categoria_evolucao(text) to authenticated;

notify pgrst, 'reload schema';
