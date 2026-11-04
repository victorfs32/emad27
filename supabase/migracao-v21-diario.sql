-- EMAD 27 — versão 21: diário de atendimentos (folha "Ocorrência - EMAD"): equipe do dia, atendimentos
-- de manhã e de tarde (sinais vitais, profissionais e procedimentos) e intercorrências.
-- Execute no Supabase: SQL Editor > New query > colar > Run. Pode ser repetido; não apaga dados.

create table if not exists public.diario_dias (
  data date primary key,
  equipe jsonb not null default '{}'::jsonb,
  anotacoes text,
  atualizado_por text,
  atualizado_em timestamptz not null default now()
);
alter table public.diario_dias enable row level security;
drop policy if exists ver_diario_dias on public.diario_dias;
create policy ver_diario_dias on public.diario_dias for select to authenticated using (public.perm('ver'));
revoke all on public.diario_dias from anon;

create table if not exists public.diario_atendimentos (
  id bigint generated always as identity primary key,
  data date not null,
  turno text not null check (turno in ('manha','tarde')),
  paciente_id bigint references public.pacientes(id) on delete set null,
  paciente_nome text not null,
  pa text, fc text, fr text, ta text, dx text, spo2 text,
  profissionais text[] not null default '{}',
  procedimentos text[] not null default '{}',
  usuario_id uuid default auth.uid(),
  autor text not null default 'Sistema',
  criado_em timestamptz not null default now()
);
create index if not exists ix_diario_data on public.diario_atendimentos (data, turno, id);
create index if not exists ix_diario_pac on public.diario_atendimentos (paciente_id);
alter table public.diario_atendimentos enable row level security;
drop policy if exists ver_diario_atendimentos on public.diario_atendimentos;
create policy ver_diario_atendimentos on public.diario_atendimentos for select to authenticated using (public.perm('ver'));
revoke all on public.diario_atendimentos from anon;

create or replace function public.salvar_diario_dia(p_data date, p_equipe jsonb, p_anotacoes text) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.perm('editar') then
    raise exception 'Sem permissão para editar.' using errcode = '42501';
  end if;
  if p_data is null or p_data > current_date then
    raise exception 'Data inválida.';
  end if;
  if length(coalesce(p_anotacoes, '')) > 6000 or length(coalesce(p_equipe::text, '')) > 4000 then
    raise exception 'Texto longo demais.';
  end if;
  insert into public.diario_dias (data, equipe, anotacoes, atualizado_por, atualizado_em)
  values (p_data, coalesce(p_equipe, '{}'::jsonb), nullif(trim(p_anotacoes), ''), public.nome_do_usuario(), now())
  on conflict (data) do update
    set equipe = excluded.equipe, anotacoes = excluded.anotacoes,
        atualizado_por = excluded.atualizado_por, atualizado_em = now();
end
$fn$;

create or replace function public.salvar_atendimento_diario(p_id bigint, p jsonb) returns bigint
language plpgsql security definer set search_path = public as $fn$
declare
  v_id bigint := p_id;
  v_data date := (p ->> 'data')::date;
  v_pac bigint := nullif(p ->> 'paciente_id', '')::bigint;
  v_nome text := trim(coalesce(p ->> 'paciente_nome', ''));
  v_prof text[] := array(select jsonb_array_elements_text(coalesce(p -> 'profissionais', '[]'::jsonb)));
  v_proc text[] := array(select jsonb_array_elements_text(coalesce(p -> 'procedimentos', '[]'::jsonb)));
begin
  if not public.perm('editar') then
    raise exception 'Sem permissão para editar.' using errcode = '42501';
  end if;
  if v_data is null or v_data > current_date then
    raise exception 'Data inválida.';
  end if;
  if (p ->> 'turno') not in ('manha', 'tarde') then
    raise exception 'Turno inválido.';
  end if;
  if v_pac is not null then
    select nome into v_nome from public.pacientes where id = v_pac;
    if v_nome is null then
      raise exception 'Paciente não encontrado.';
    end if;
  end if;
  if length(v_nome) < 2 or length(v_nome) > 120 then
    raise exception 'Informe o paciente.';
  end if;
  if not (v_prof <@ array['M','F','E','TE']) then
    raise exception 'Profissional inválido.';
  end if;
  if not (v_proc <@ array['solicitacao_samu','remocao_samu','ambulancia_pmc','troca_gtt','troca_sne','troca_sng',
      'troca_cistostomia','svd','cateterismo_alivio','troca_colostomia','retirada_pontos','clister','antibiotico',
      'injetaveis','coletas','exames_coleta','sinais_vitais','glicemia','curativos','aspiracao','desospitalizacao',
      'pacientes_uaps','outros_emad','pos_obito','inicio_atb']) then
    raise exception 'Procedimento inválido.';
  end if;

  if p_id is null then
    insert into public.diario_atendimentos
      (data, turno, paciente_id, paciente_nome, pa, fc, fr, ta, dx, spo2, profissionais, procedimentos, autor)
    values
      (v_data, p ->> 'turno', v_pac, v_nome,
       substr(nullif(trim(p ->> 'pa'), ''), 1, 20), substr(nullif(trim(p ->> 'fc'), ''), 1, 10),
       substr(nullif(trim(p ->> 'fr'), ''), 1, 10), substr(nullif(trim(p ->> 'ta'), ''), 1, 10),
       substr(nullif(trim(p ->> 'dx'), ''), 1, 10), substr(nullif(trim(p ->> 'spo2'), ''), 1, 10),
       v_prof, v_proc, public.nome_do_usuario())
    returning id into v_id;
  else
    update public.diario_atendimentos
       set turno = p ->> 'turno', paciente_id = v_pac, paciente_nome = v_nome,
           pa = substr(nullif(trim(p ->> 'pa'), ''), 1, 20), fc = substr(nullif(trim(p ->> 'fc'), ''), 1, 10),
           fr = substr(nullif(trim(p ->> 'fr'), ''), 1, 10), ta = substr(nullif(trim(p ->> 'ta'), ''), 1, 10),
           dx = substr(nullif(trim(p ->> 'dx'), ''), 1, 10), spo2 = substr(nullif(trim(p ->> 'spo2'), ''), 1, 10),
           profissionais = v_prof, procedimentos = v_proc
     where id = p_id;
    if not found then
      raise exception 'Atendimento não encontrado.';
    end if;
  end if;
  return v_id;
end
$fn$;

create or replace function public.remover_atendimento_diario(p_id bigint) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.perm('editar') then
    raise exception 'Sem permissão para editar.' using errcode = '42501';
  end if;
  delete from public.diario_atendimentos where id = p_id;
  if not found then
    raise exception 'Atendimento não encontrado.';
  end if;
end
$fn$;

revoke execute on function public.salvar_diario_dia(date, jsonb, text) from public, anon;
revoke execute on function public.salvar_atendimento_diario(bigint, jsonb) from public, anon;
revoke execute on function public.remover_atendimento_diario(bigint) from public, anon;
grant execute on function public.salvar_diario_dia(date, jsonb, text) to authenticated;
grant execute on function public.salvar_atendimento_diario(bigint, jsonb) to authenticated;
grant execute on function public.remover_atendimento_diario(bigint) to authenticated;
notify pgrst, 'reload schema';
