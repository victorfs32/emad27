-- EMAD 27 — versão 3: controle de dispositivos (GTT, SNG, SNE, SVD, cistostomia)
-- com número, confecção, data da troca e próxima troca. Equivale à planilha DEVICES.
-- Execute no Supabase: SQL Editor > New query > colar > Run. Pode ser repetido; não apaga dados.
-- (O mesmo bloco também está no final de schema.sql.)

create table if not exists public.dispositivos (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  tipo text not null check (tipo in ('gtt','sng','sne','svd','cistostomia')),
  numero text,
  confeccao text,
  troca date,
  proxima_troca date,
  obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists ix3_disp_pac on public.dispositivos (paciente_id);
create index if not exists ix3_disp_proxima on public.dispositivos (proxima_troca);

alter table public.dispositivos enable row level security;
drop policy if exists ver_dispositivos on public.dispositivos;
create policy ver_dispositivos on public.dispositivos for select to authenticated using (public.perm('ver'));

create or replace function public.rotulo_dispositivo(t text) returns text
language sql immutable as $$
  select case t when 'gtt' then 'Gastrostomia (GTT)' when 'sng' then 'Sonda nasogástrica (SNG)'
    when 'sne' then 'Sonda nasoenteral (SNE)' when 'svd' then 'Sonda vesical de demora (SVD)'
    when 'cistostomia' then 'Cistostomia' else t end
$$;

-- Cria (p_id nulo) ou atualiza um dispositivo e registra no histórico do paciente.
create or replace function public.salvar_dispositivo(p_id bigint, p_paciente bigint, p jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint := p_id; novo public.dispositivos; antigo jsonb;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  novo := jsonb_populate_record(null::public.dispositivos, p);
  if p_id is null then
    if not exists (select 1 from public.pacientes where id = p_paciente) then raise exception 'Paciente não encontrado.'; end if;
    insert into public.dispositivos (paciente_id, tipo, numero, confeccao, troca, proxima_troca, obs)
    values (p_paciente, novo.tipo, novo.numero, novo.confeccao, novo.troca, novo.proxima_troca, novo.obs)
    returning id into v_id;
    insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
    values (p_paciente, auth.uid(), public.nome_do_usuario(), 'dispositivo',
            'Dispositivo registrado: ' || public.rotulo_dispositivo(novo.tipo), p);
  else
    select to_jsonb(d) - 'id' - 'paciente_id' - 'criado_em' - 'atualizado_em' into antigo from public.dispositivos d where id = p_id;
    if antigo is null then raise exception 'Dispositivo não encontrado.'; end if;
    update public.dispositivos
       set tipo = novo.tipo, numero = novo.numero, confeccao = novo.confeccao, troca = novo.troca,
           proxima_troca = novo.proxima_troca, obs = novo.obs, atualizado_em = now()
     where id = p_id returning paciente_id into p_paciente;
    insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
    values (p_paciente, auth.uid(), public.nome_do_usuario(), 'dispositivo',
            'Dispositivo atualizado: ' || public.rotulo_dispositivo(novo.tipo), jsonb_build_object('de', antigo, 'para', p));
  end if;
  return v_id;
end $$;

-- Registra uma troca: nova data de troca e próxima troca.
create or replace function public.registrar_troca(p_id bigint, p_troca date, p_proxima date) returns void
language plpgsql security definer set search_path = public as $$
declare d public.dispositivos;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  select * into d from public.dispositivos where id = p_id;
  if not found then raise exception 'Dispositivo não encontrado.'; end if;
  update public.dispositivos set troca = p_troca, proxima_troca = p_proxima, atualizado_em = now() where id = p_id;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (d.paciente_id, auth.uid(), public.nome_do_usuario(), 'dispositivo',
          'Troca registrada: ' || public.rotulo_dispositivo(d.tipo),
          jsonb_build_object('troca_anterior', d.troca, 'troca', p_troca, 'proxima_troca', p_proxima));
end $$;

create or replace function public.remover_dispositivo(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare d public.dispositivos;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  delete from public.dispositivos where id = p_id returning * into d;
  if not found then raise exception 'Dispositivo não encontrado.'; end if;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (d.paciente_id, auth.uid(), public.nome_do_usuario(), 'dispositivo',
          'Dispositivo removido: ' || public.rotulo_dispositivo(d.tipo),
          jsonb_build_object('numero', d.numero, 'troca', d.troca, 'proxima_troca', d.proxima_troca));
end $$;

revoke execute on function public.salvar_dispositivo(bigint, bigint, jsonb), public.registrar_troca(bigint, date, date),
  public.remover_dispositivo(bigint) from public;
grant execute on function public.salvar_dispositivo(bigint, bigint, jsonb) to authenticated;
grant execute on function public.registrar_troca(bigint, date, date) to authenticated;
grant execute on function public.remover_dispositivo(bigint) to authenticated;
revoke all on public.dispositivos from anon;

notify pgrst, 'reload schema';
