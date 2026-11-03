---
name: migracao-banco
description: Criar e aplicar uma mudança no banco Supabase do EMAD 27 (coluna, tabela ou função). Use quando uma funcionalidade precisar guardar dado novo.
---

# Migração do banco (Supabase)

Projeto Supabase: `mvhdhifftoshaecprwho`. Regras do banco:
- **Ninguém grava direto nas tabelas.** Toda gravação passa por funções `security definer` que conferem
  a permissão com `public.perm('editar' | 'cadastrar' | 'exportar' | 'prescrever' | 'admin')`.
- Toda tabela nova tem RLS ligado, política de leitura `to authenticated using (public.perm('ver'))`
  e `revoke all on <tabela> from anon`.
- Toda função nova: `revoke execute ... from public, anon` e `grant execute ... to authenticated`.
- Mudanças em `pacientes` ficam no histórico sozinhas (gatilho `auditar_paciente`); em outras tabelas,
  grave em `public.historico` dentro da função.

## Passos
1. Escreva `supabase/migracao-vNN-<assunto>.sql` (NN = próximo número). Tudo idempotente:
   `add column if not exists`, `create table if not exists`, `create or replace function`, `drop policy if exists`.
   Termine com `notify pgrst, 'reload schema';`.
2. Coloque o mesmo bloco em `supabase/schema.sql` (antes do bloco "versão 18: segurança das funções").
3. Coluna nova em `pacientes` que vem do formulário: acrescente-a à lista `cols` de `salvar_paciente`
   (no schema e na migração, com a função inteira).
4. No código, trate a falta da migração sem quebrar a página: erros `42703`, `42P01`, `PGRST202`, `PGRST204`,
   `PGRST205` → mostrar aviso "Falta rodar a migração vNN no Supabase".
5. Aplicar: `mcp__Supabase__apply_migration` pede aprovação na tela do usuário e costuma expirar.
   O jeito confiável é **mandar o SQL em texto** para o usuário colar em SQL Editor > New query > Run.
6. Depois que o usuário rodar, confira com `execute_sql` (colunas, tabelas, funções e que `anon` não executa nada).
   Nunca leia dados de pacientes para conferir: use só contagens e o catálogo do Postgres.
