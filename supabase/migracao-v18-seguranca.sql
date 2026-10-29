-- EMAD 27 — versão 18: segurança das funções do banco.
-- Quem não fez login (papel "anon") deixa de poder chamar qualquer função; as funções criadas daqui para frente
-- também nascem sem essa permissão. Usuários logados continuam como antes (cada função confere a permissão por dentro).
-- Execute no Supabase: SQL Editor > New query > colar > Run. Pode ser repetido; não apaga dados.
-- (O mesmo bloco também está no fim de schema.sql.)

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;

-- Função auxiliar sem search_path fixo (alerta do Supabase "Function Search Path Mutable").
do $$
begin
  if to_regprocedure('public.rotulo_dispositivo(text)') is not null then
    alter function public.rotulo_dispositivo(text) set search_path = public;
  end if;
end $$;

notify pgrst, 'reload schema';
