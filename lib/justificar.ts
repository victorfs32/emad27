// Texto corrido justificado nos PDFs (jsPDF só alinha à esquerda, centro ou direita nas linhas já quebradas).
import type { jsPDF as JsPDF } from "jspdf";

/**
 * Escreve o texto justificado: cada parágrafo (separado por quebra de linha) tem todas as linhas ajustadas
 * às duas margens, menos a última, que fica à esquerda. A fonte e o tamanho já devem estar definidos.
 * Devolve quantas linhas foram escritas.
 */
export function textoJustificado(doc: JsPDF, texto: string, x: number, y: number, largura: number, passo: number, maxLinhas = Infinity): number {
  let n = 0;
  for (const paragrafo of texto.split(/\r?\n/)) {
    if (n >= maxLinhas) break;
    if (!paragrafo.trim()) {
      n++;
      continue;
    }
    const linhas = doc.splitTextToSize(paragrafo.trim(), largura) as string[];
    for (const [i, linha] of linhas.entries()) {
      if (n >= maxLinhas) break;
      const yy = y + n * passo;
      const palavras = linha.split(/\s+/).filter(Boolean);
      if (i < linhas.length - 1 && palavras.length > 1) {
        const soma = palavras.reduce((a, p) => a + doc.getTextWidth(p), 0);
        const espaco = (largura - soma) / (palavras.length - 1);
        let xx = x;
        for (const p of palavras) {
          doc.text(p, xx, yy);
          xx += doc.getTextWidth(p) + espaco;
        }
      } else {
        doc.text(linha, x, yy);
      }
      n++;
    }
  }
  return n;
}
