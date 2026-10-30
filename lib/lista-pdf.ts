// Relatório em PDF de uma lista (A4 retrato): cabeçalho com logotipo, tabela e resumo.
// Usado nas páginas Dispositivos e Lesões. Roda no navegador (a biblioteca de PDF só é carregada ao clicar).
import type { jsPDF as JsPDF } from "jspdf";
import { EQUIPE } from "./equipe";
import { desenharLogo, PROPORCAO_LOGO } from "./logo";

export type DadosListaPdf = {
  titulo: string;
  subtitulo: string;
  /** Larguras em mm (vazio = automática). */
  colunas: { titulo: string; largura?: number; centro?: boolean; negrito?: boolean }[];
  linhas: string[][];
  /** Linhas destacadas (ex.: troca vencida), pelo índice. */
  destacar?: number[];
  vazio: string;
  resumo: string;
  arquivo: string;
  geradoEm: string;
};

type Cor = [number, number, number];
const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");

export async function montarListaPdf(d: DadosListaPdf): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const [{ jsPDF }, tabela] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = tabela.default;
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({ title: d.titulo, author: "EMAD 27", subject: d.titulo, creator: "EMAD 27 — Programa Melhor em Casa" });

  const X0 = 12, X1 = 198;
  const larguraLogo = 38;
  desenharLogo(doc, X0, 10, larguraLogo);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(20, 20, 20);
  doc.text(limpar(d.titulo.toUpperCase()), X1, 17, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70, 85, 85);
  doc.text(limpar(d.subtitulo), X1, 23, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(90, 100, 100);
  const equipe = doc.splitTextToSize(limpar(EQUIPE.map(([f, n]) => `${f}: ${n}`).join(" · ")), 125) as string[];
  doc.text(equipe, X1, 28.5, { align: "right", lineHeightFactor: 1.35 });
  const y = 10 + larguraLogo * PROPORCAO_LOGO + 6;

  const destaque = new Set(d.destacar ?? []);
  autoTable(doc, {
    startY: y,
    margin: { left: X0, right: 210 - X1, top: 14, bottom: 16 },
    head: [d.colunas.map((c) => ({ content: c.titulo, styles: { halign: c.centro ? "center" as const : "left" as const } }))],
    body: d.linhas.length
      ? d.linhas.map((l) => l.map(limpar))
      : [[{ content: limpar(d.vazio), colSpan: d.colunas.length, styles: { halign: "center" as const, textColor: [90, 100, 100] as Cor } }]],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.6, cellPadding: 1.8, textColor: [20, 20, 20], lineColor: [190, 200, 200], lineWidth: 0.2, valign: "middle" },
    headStyles: { fillColor: [29, 111, 87], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 248, 247] },
    columnStyles: Object.fromEntries(d.colunas.map((c, i) => [i, {
      cellWidth: c.largura ?? "auto", halign: c.centro ? "center" : "left", fontStyle: c.negrito ? "bold" : "normal",
    }])),
    didParseCell: (h) => {
      if (h.section === "body" && destaque.has(h.row.index) && d.linhas.length) {
        h.cell.styles.fillColor = [255, 220, 234];
        h.cell.styles.textColor = [140, 20, 60];
      }
    },
    rowPageBreak: "avoid",
  });
  const fim = (doc as JsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(20, 20, 20);
  const resumo = doc.splitTextToSize(limpar(d.resumo), X1 - X0) as string[];
  if (fim + 6 + resumo.length * 5 > 280) doc.addPage();
  doc.text(resumo, X0, fim + 7 > 280 ? 20 : fim + 7, { lineHeightFactor: 1.35 });

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 120, 120);
    doc.text(limpar(`EMAD 27 — Programa Melhor em Casa · ${d.titulo} · gerado em ${d.geradoEm}`), 105, 289, { align: "center" });
    if (paginas > 1) doc.text(`${p}/${paginas}`, X1, 289, { align: "right" });
  }
  return { doc, nomeArquivo: d.arquivo };
}

export async function baixarListaPdf(d: DadosListaPdf): Promise<void> {
  const { doc, nomeArquivo } = await montarListaPdf(d);
  doc.save(nomeArquivo);
}
