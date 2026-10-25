-- Versão 14: identificação do profissional (CPF, CNS, CBO, CNES e INE) no perfil do usuário.
-- Pode rodar mais de uma vez.

alter table public.perfis add column if not exists cpf text;
alter table public.perfis add column if not exists cns text;
alter table public.perfis add column if not exists cbo text;
alter table public.perfis add column if not exists cnes text;
alter table public.perfis add column if not exists ine text;

-- Cada pessoa atualiza o próprio nome e identificação (só dígitos nos códigos).
create or replace function public.atualizar_meu_cadastro(p_nome text, p_cpf text, p_cns text, p_cbo text, p_cnes text, p_ine text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_nome text := regexp_replace(btrim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_cpf text := nullif(regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g'), '');
  v_cns text := nullif(regexp_replace(coalesce(p_cns, ''), '\D', '', 'g'), '');
  v_cbo text := nullif(regexp_replace(coalesce(p_cbo, ''), '\D', '', 'g'), '');
  v_cnes text := nullif(regexp_replace(coalesce(p_cnes, ''), '\D', '', 'g'), '');
  v_ine text := nullif(regexp_replace(coalesce(p_ine, ''), '\D', '', 'g'), '');
begin
  if auth.uid() is null then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if length(v_nome) < 2 or length(v_nome) > 120 then raise exception 'Informe o nome.'; end if;
  if v_cpf is not null and length(v_cpf) <> 11 then raise exception 'CPF deve ter 11 dígitos.'; end if;
  if v_cns is not null and length(v_cns) <> 15 then raise exception 'CNS deve ter 15 dígitos.'; end if;
  if v_cbo is not null and length(v_cbo) <> 6 then raise exception 'CBO deve ter 6 dígitos.'; end if;
  if v_cnes is not null and length(v_cnes) <> 7 then raise exception 'CNES deve ter 7 dígitos.'; end if;
  if v_ine is not null and length(v_ine) <> 10 then raise exception 'INE deve ter 10 dígitos.'; end if;
  update public.perfis
     set nome = v_nome, cpf = v_cpf, cns = v_cns, cbo = v_cbo, cnes = v_cnes, ine = v_ine
   where user_id = auth.uid() and ativo;
end $$;

revoke execute on function public.atualizar_meu_cadastro(text, text, text, text, text, text) from public;
grant execute on function public.atualizar_meu_cadastro(text, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
