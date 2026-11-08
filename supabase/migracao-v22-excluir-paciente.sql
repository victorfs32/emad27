-- EMAD 27 — versão 22: excluir paciente do programa (somente administradores).
-- Apaga o paciente e tudo o que é dele (visitas, evoluções, prescrições, histórico...).
-- Fica um registro mínimo da exclusão (quem, quando, motivo) em exclusoes_pacientes.
-- Execute no Supabase: SQL Editor > New query > colar > Run. Pode ser repetido; não apaga dados.

create table if not exists public.exclusoes_pacientes (
  id bigint generated always as identity primary key,
  paciente_id bigint not null,
  nome text not null,
  prontuario text,
  motivo text not null,
  usuario_id uuid default auth.uid(),
  autor text not null,
  em timestamptz not null default now()
);
alter table public.exclusoes_pacientes enable row level security;
drop policy if exists ver_exclusoes_pacientes on public.exclusoes_pacientes;
create policy ver_exclusoes_pacientes on public.exclusoes_pacientes for select to authenticated using (public.perm('admin'));
revoke all on public.exclusoes_pacientes from anon;

create or replace function public.excluir_paciente(p_id bigint, p_nome_confirmado text, p_motivo text) returns void
language plpgsql security definer set search_path = public as $fn$
declare
  v_nome text;
  v_pront text;
begin
  if not public.perm('admin') then
    raise exception 'Somente administradores podem excluir paciente.' using errcode = '42501';
  end if;
  select nome, prontuario into v_nome, v_pront from public.pacientes where id = p_id;
  if v_nome is null then
    raise exception 'Paciente não encontrado.';
  end if;
  if lower(regexp_replace(trim(coalesce(p_nome_confirmado, '')), '\s+', ' ', 'g'))
     <> lower(regexp_replace(trim(v_nome), '\s+', ' ', 'g')) then
    raise exception 'O nome digitado não confere com o do paciente.';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 or length(p_motivo) > 500 then
    raise exception 'Informe o motivo da exclusão.';
  end if;
  insert into public.exclusoes_pacientes (paciente_id, nome, prontuario, motivo, autor)
  values (p_id, v_nome, v_pront, trim(p_motivo), public.nome_do_usuario());
  delete from public.pacientes where id = p_id;
end
$fn$;

revoke execute on function public.excluir_paciente(bigint, text, text) from public, anon;
grant execute on function public.excluir_paciente(bigint, text, text) to authenticated;
notify pgrst, 'reload schema';
