-- Versão 13: carimbo do profissional (cargo, conselho e registro de especialista), impresso nos documentos.
-- Pode rodar mais de uma vez.

alter table public.perfis add column if not exists cargo text;
alter table public.perfis add column if not exists registro text;
alter table public.perfis add column if not exists registro_especialista text;

-- Cada pessoa altera só o próprio carimbo.
create or replace function public.atualizar_meu_carimbo(p_cargo text, p_registro text, p_especialista text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if length(coalesce(p_cargo, '')) > 60 or length(coalesce(p_registro, '')) > 80 or length(coalesce(p_especialista, '')) > 80 then
    raise exception 'Texto longo demais.';
  end if;
  update public.perfis
     set cargo = nullif(btrim(p_cargo), ''),
         registro = nullif(btrim(p_registro), ''),
         registro_especialista = nullif(btrim(p_especialista), '')
   where user_id = auth.uid() and ativo;
end $$;

revoke execute on function public.atualizar_meu_carimbo(text, text, text) from public;
grant execute on function public.atualizar_meu_carimbo(text, text, text) to authenticated;

notify pgrst, 'reload schema';
