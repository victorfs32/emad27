---
name: publicar
description: Verificar, enviar ao GitHub e colocar no ar (Vercel) uma mudança do site EMAD 27. Use ao terminar qualquer alteração de código neste projeto.
---

# Publicar uma mudança do EMAD 27

O site está em produção na Vercel (deploy automático do branch `master`) com banco no Supabase.
O usuário autorizou: **sempre pode fazer o merge** quando o build de teste da Vercel passar.

## 1. Partir do master atualizado
```bash
git fetch origin master && git checkout -B master-2xbkcl origin/master
```
(O pull request anterior já foi mergeado; nunca empilhe commits em cima de um PR fechado.)

## 2. Verificar antes de subir
```bash
npm run lint
rm -rf .next && SUPABASE_URL=https://example.supabase.co SUPABASE_ANON_KEY=dummy npm run build
npx tsc --noEmit        # depois do build (os tipos PageProps/LayoutProps são gerados por ele)
```
- Se rodou `next dev` numa página temporária de teste, apague a página, restaure o `proxy.ts` e apague `.next`
  antes do build (tipos velhos em `.next/dev/types` quebram o `tsc`).
- Mudança visual: confira em print com Playwright em 390 px e 1280 px, sem rolagem horizontal.

## 3. Commit, push e pull request
- Mensagem de commit em português, explicando o que muda para a equipe.
- `git push -u origin master-2xbkcl`, depois abra o PR para `master` (ferramentas `mcp__github__*`).
- Corpo do PR: O que muda / Banco de dados (se houver migração) / Verificação (o que foi testado e o que não foi).

## 4. Esperar a Vercel e fazer o merge
- Status do PR (`pull_request_read` com `get_status`): espere `success` do contexto "Vercel".
- Merge com `expectedHeadSha` do head atual.
- Confirme o deploy de produção: `mcp__Vercel__list_deployments` (projeto `prj_n94cpK3aPzdmHZjNOCTQ7t5W1o1S`,
  time `team_ECQMYPUXTrDeWsEoDcI27WEv`, `target: production`) com `state: READY`.

## 5. Avisar o usuário
Em português simples: o que mudou na tela, onde fica, e o que ele precisa fazer (por exemplo, rodar uma migração).
