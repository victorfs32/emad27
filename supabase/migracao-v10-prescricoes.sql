-- EMAD 27 — versão 10: prescrições digitadas no sistema (data, prescrição e aprazamento) e a permissão "Prescrever".
-- Execute no Supabase: SQL Editor > New query > colar > Run. Pode ser repetido; não apaga dados.
-- (O mesmo bloco também está em schema.sql. Rode esta migração depois da v9.)

alter table public.perfis add column if not exists pode_prescrever boolean not null default false;

create or replace function public.perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case p
      when 'ver' then ativo
      when 'cadastrar' then ativo and (admin or pode_cadastrar)
      when 'editar' then ativo and (admin or pode_editar)
      when 'exportar' then ativo and (admin or pode_exportar)
      when 'prescrever' then ativo and (admin or pode_prescrever)
      when 'admin' then ativo and admin
      else false end
    from public.perfis where user_id = auth.uid()), false)
$$;

create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
declare primeiro boolean;
begin
  select not exists (select 1 from public.perfis) into primeiro;
  insert into public.perfis (user_id, nome, admin, pode_cadastrar, pode_editar, pode_exportar, pode_prescrever)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'nome', ''), new.email), primeiro, primeiro, primeiro, primeiro, primeiro)
  on conflict (user_id) do nothing;
  return new;
end $$;

create or replace function public.registrar_documento(p_id bigint, p_tipo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_resumo text;
begin
  if not public.perm('exportar') then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  v_resumo := case p_tipo
    when 'relatorio' then 'Relatório em PDF gerado'
    when 'prescricao' then 'Formulário de prescrição médica gerado'
    when 'prescricao_impressa' then 'Prescrição impressa'
    else null end;
  if v_resumo is null then raise exception 'Tipo de documento inválido.'; end if;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo)
  values (p_id, auth.uid(), public.nome_do_usuario(), 'documento', v_resumo);
end $$;

create table if not exists public.prescricoes (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  data date not null,
  datas_aprazamento jsonb not null default '[]'::jsonb,
  itens jsonb not null default '[]'::jsonb,
  observacoes text,
  usuario_id uuid,
  autor text not null default 'Sistema',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists ix10_presc_pac on public.prescricoes (paciente_id, data desc, id desc);

alter table public.prescricoes enable row level security;
drop policy if exists ver_prescricoes on public.prescricoes;
create policy ver_prescricoes on public.prescricoes for select to authenticated using (public.perm('ver'));

-- Cria (p_id nulo) ou altera uma prescrição. Quem digita precisa da permissão "prescrever";
-- alterar ou remover é permitido a quem a fez e aos administradores. Tudo fica no histórico do paciente.
create or replace function public.salvar_prescricao(p_id bigint, p_paciente bigint, p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_id bigint := p_id;
  v_data date;
  v_itens jsonb := coalesce(p -> 'itens', '[]'::jsonb);
  v_datas jsonb := coalesce(p -> 'datas_aprazamento', '[]'::jsonb);
  v_obs text := nullif(btrim(left(coalesce(p ->> 'observacoes', ''), 2000)), '');
  it jsonb; d jsonb; antes jsonb; v_autor uuid;
begin
  if not public.perm('prescrever') then raise exception 'Sem permissão para prescrever.' using errcode = '42501'; end if;

  begin v_data := (p ->> 'data')::date; exception when others then v_data := null; end;
  if v_data is null then raise exception 'Informe a data da prescrição.'; end if;

  if jsonb_typeof(v_itens) <> 'array' or jsonb_array_length(v_itens) = 0 then raise exception 'Inclua ao menos um item na prescrição.'; end if;
  if jsonb_array_length(v_itens) > 40 then raise exception 'Itens demais na prescrição (máximo 40).'; end if;
  for it in select value from jsonb_array_elements(v_itens) loop
    if jsonb_typeof(it) <> 'object' or length(btrim(coalesce(it ->> 'texto', ''))) = 0 then raise exception 'Todo item precisa ter a prescrição escrita.'; end if;
    if length(it ->> 'texto') > 2000 then raise exception 'Há item com texto longo demais.'; end if;
    if coalesce(it ->> 'data', '') <> '' then
      begin perform (it ->> 'data')::date; exception when others then raise exception 'Há item com data inválida.'; end;
    end if;
    if jsonb_typeof(coalesce(it -> 'aprazamento', '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(it -> 'aprazamento', '[]'::jsonb)) > 5 then
      raise exception 'Aprazamento inválido.';
    end if;
    for d in select value from jsonb_array_elements(coalesce(it -> 'aprazamento', '[]'::jsonb)) loop
      if jsonb_typeof(d) <> 'string' or length(d #>> '{}') > 60 then raise exception 'Aprazamento inválido.'; end if;
    end loop;
  end loop;
  if jsonb_typeof(v_datas) <> 'array' or jsonb_array_length(v_datas) > 5 then raise exception 'Datas do aprazamento inválidas.'; end if;
  for d in select value from jsonb_array_elements(v_datas) loop
    if jsonb_typeof(d) <> 'string' then raise exception 'Datas do aprazamento inválidas.'; end if;
    if (d #>> '{}') <> '' then
      begin perform (d #>> '{}')::date; exception when others then raise exception 'Data do aprazamento inválida.'; end;
    end if;
  end loop;

  if p_id is null then
    if not exists (select 1 from public.pacientes where id = p_paciente) then raise exception 'Paciente não encontrado.'; end if;
    insert into public.prescricoes (paciente_id, data, datas_aprazamento, itens, observacoes, usuario_id, autor)
    values (p_paciente, v_data, v_datas, v_itens, v_obs, auth.uid(), public.nome_do_usuario())
    returning id into v_id;
    insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
    values (p_paciente, auth.uid(), public.nome_do_usuario(), 'prescricao',
            'Prescrição registrada (' || jsonb_array_length(v_itens)::text || case when jsonb_array_length(v_itens) = 1 then ' item)' else ' itens)' end,
            jsonb_build_object('prescricao_id', v_id, 'data', v_data));
  else
    select to_jsonb(x), x.usuario_id into antes, v_autor from public.prescricoes x where x.id = p_id;
    if antes is null then raise exception 'Prescrição não encontrada.'; end if;
    if v_autor is distinct from auth.uid() and not public.perm('admin') then
      raise exception 'Somente quem fez a prescrição (ou um administrador) pode alterá-la.' using errcode = '42501';
    end if;
    update public.prescricoes
       set data = v_data, datas_aprazamento = v_datas, itens = v_itens, observacoes = v_obs, atualizado_em = now()
     where id = p_id returning paciente_id into p_paciente;
    insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
    values (p_paciente, auth.uid(), public.nome_do_usuario(), 'prescricao', 'Prescrição alterada',
            jsonb_build_object('prescricao_id', p_id, 'antes', antes - 'usuario_id'));
  end if;
  return v_id;
end $$;

create or replace function public.remover_prescricao(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare d public.prescricoes;
begin
  if not public.perm('prescrever') then raise exception 'Sem permissão para prescrever.' using errcode = '42501'; end if;
  select * into d from public.prescricoes where id = p_id;
  if not found then raise exception 'Prescrição não encontrada.'; end if;
  if d.usuario_id is distinct from auth.uid() and not public.perm('admin') then
    raise exception 'Somente quem fez a prescrição (ou um administrador) pode removê-la.' using errcode = '42501';
  end if;
  delete from public.prescricoes where id = p_id;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (d.paciente_id, auth.uid(), public.nome_do_usuario(), 'prescricao', 'Prescrição removida', to_jsonb(d) - 'usuario_id');
end $$;

revoke execute on function public.salvar_prescricao(bigint, bigint, jsonb), public.remover_prescricao(bigint) from public;
grant execute on function public.salvar_prescricao(bigint, bigint, jsonb) to authenticated;
grant execute on function public.remover_prescricao(bigint) to authenticated;
revoke all on public.prescricoes from anon;

notify pgrst, 'reload schema';
