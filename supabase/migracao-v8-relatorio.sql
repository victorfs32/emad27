-- EMAD 27 — versão 8: registra no histórico do paciente quem gerou um relatório em PDF.
-- Execute no Supabase: SQL Editor > New query > colar > Run. Pode ser repetido; não apaga dados.
-- (O mesmo bloco também está no final de schema.sql.)

create or replace function public.registrar_relatorio(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.perm('exportar') then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  insert into public.historico (paciente_id, usuario_id, autor, tipo, resumo)
  values (p_id, auth.uid(), public.nome_do_usuario(), 'relatorio', 'Relatório em PDF gerado');
end $$;

revoke execute on function public.registrar_relatorio(bigint) from public;
grant execute on function public.registrar_relatorio(bigint) to authenticated;

notify pgrst, 'reload schema';
