---
name: campo-paciente
description: Acrescentar um campo novo ao cadastro do paciente do EMAD 27 (formulário, ficha, histórico, PDFs e exportação). Use quando o usuário pedir "coloca no cadastro X".
---

# Campo novo no cadastro do paciente

Siga o caminho de um campo existente parecido (ex.: `usa_aspirador_pmec` para sim/não, `nome_social` para texto).
Arquivos a tocar:

| Onde | O quê |
|---|---|
| `supabase/migracao-vNN-*.sql` e `schema.sql` | coluna + `cols` de `salvar_paciente` (skill **migracao-banco**) |
| `lib/formulario.ts` | tipo `DadosForm` e `formularioVazio` |
| `lib/pacientes.ts` | tipo `Ficha` (opcional `?` até a migração rodar), `normalizar` e `paraFormulario` |
| `app/(app)/pacientes/formulario.tsx` | o campo na seção certa (sim/não usa `<Tri>`) |
| `app/(app)/pacientes/[id]/page.tsx` | exibir na ficha com `<Dado>` |
| `lib/rotulos.ts` | nome legível no histórico (e `valorLegivel` se precisar formatar) |
| `app/exportar/route.ts` | coluna do CSV, se fizer sentido |
| `lib/relatorio-pdf.ts`, `lib/capa-pdf.ts` | se o dado aparece nesses documentos |

Depois: skill **publicar**, e mandar o SQL da migração para o usuário rodar.
