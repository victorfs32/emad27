---
name: pdf-emad
description: Fazer ou ajustar um PDF no padrão do EMAD 27 (capa, indicadores, relatórios, documentos). Use sempre que o pedido envolver PDF.
---

# PDFs no padrão EMAD 27

- Biblioteca: `jspdf` + `jspdf-autotable`, **carregados só ao clicar** (`await import(...)` dentro do botão).
  Os geradores ficam em `lib/*-pdf.ts`; o servidor só entrega os dados (server action ou props).
- A4 **retrato** por padrão (o usuário prefere vertical). Indicadores: tudo **numa folha só** (modo compacto).
- Cabeçalho: logotipo `desenharLogo` (`lib/logo.ts`), título à direita, mês/EMAD e a equipe (`lib/equipe.ts`).
- Assinatura: **em branco**, com a linha "Assinatura e carimbo do responsável" (assinam e carimbam à mão).
- Texto: passe tudo por `limpar()` (a fonte padrão só tem Latin-1; "✓" e emojis somem). Use "[visitado]" etc.
- Cores das planilhas de indicadores: faixa título `#FFC000`, orientação `#FFFF00`.
- Um botão só por página quando o usuário pedir ("só o geral").

## Conferir antes de publicar
Gere um PDF de exemplo com dados fictícios num script em scratchpad e veja a imagem:
```bash
npx tsx teste.ts saida.pdf && pdftoppm -png -r 70 saida.pdf previa
```
Confira número de páginas (`pdfinfo`), cortes de texto e se cabe na folha. Mande o exemplo ao usuário.
