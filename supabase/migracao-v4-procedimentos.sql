-- EMAD 27 — versão 4: procedimentos e correção de registros de visita.
-- Execute no Supabase: SQL Editor > New query > colar > Run. Pode ser repetido; não apaga dados.
-- (O mesmo bloco também está no final de schema.sql.)

create table if not exists public.procedimentos (
  id bigint generated always as identity primary key,
  paciente_id bigint not null references public.pacientes(id) on delete cascade,
  data date not null,
  tipo text not null,
  obs text,
  usuario_id uuid,
  autor text not null default 'Sistema',
  criado_em timestamptz not null default now()
);
create index if not exists ix4_proc_pac on public.procedimentos (paciente_id, data desc);
create index if not exists ix4_proc_data on public.procedimentos (data desc);

alter table public.procedimentos enable row level security;
drop policy if exists ver_procedimentos on public.procedimentos;
create policy ver_procedimentos on public.procedimentos for select to authenticated using (public.perm('ver'));
drop policy if exists procedimentos_novo on public.procedimentos;
create policy procedimentos_novo on public.procedimentos for insert to authenticated with check (public.perm('editar'));

-- Quem registrou e quando é preenchido pelo banco (não pode ser falsificado pelo navegador).
drop trigger if exists ao_inserir_procedimento on public.procedimentos;
create trigger ao_inserir_procedimento before insert on public.procedimentos
  for each row execute function public.preencher_evolucao();

create or replace function public.remover_procedimento(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare d public.procedimentos;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  delete from public.procedimentos where id = p_id returning * into d;
  if not found then raise exception 'Procedimento não encontrado.'; end if;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (d.paciente_id, auth.uid(), public.nome_do_usuario(), 'procedimento', 'Procedimento removido: ' || d.tipo,
          jsonb_build_object('data', d.data, 'obs', d.obs, 'registrado_por', d.autor));
end $$;

-- Corrige registro feito por engano (ex.: visita lançada duas vezes). Fica no histórico.
create or replace function public.remover_evolucao(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare d public.evolucoes;
begin
  if not public.perm('editar') then raise exception 'Sem permissão para editar.' using errcode = '42501'; end if;
  delete from public.evolucoes where id = p_id returning * into d;
  if not found then raise exception 'Registro não encontrado.'; end if;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo, detalhes)
  values (d.paciente_id, auth.uid(), public.nome_do_usuario(), 'evolucao', 'Registro removido: ' || d.tipo,
          jsonb_build_object('data', d.data, 'texto', d.texto, 'registrado_por', d.autor));
end $$;

-- A troca de um dispositivo também entra em Procedimentos (sem digitar duas vezes).
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
  insert into public.procedimentos (paciente_id, data, tipo, obs)
  values (d.paciente_id, p_troca, upper(d.tipo), 'Troca registrada pelo controle de dispositivos' ||
          coalesce(' (nº ' || nullif(d.numero, '') || ')', ''));
end $$;

revoke execute on function public.remover_procedimento(bigint), public.remover_evolucao(bigint),
  public.registrar_troca(bigint, date, date) from public;
grant execute on function public.remover_procedimento(bigint) to authenticated;
grant execute on function public.remover_evolucao(bigint) to authenticated;
grant execute on function public.registrar_troca(bigint, date, date) to authenticated;
revoke all on public.procedimentos from anon;

notify pgrst, 'reload schema';
