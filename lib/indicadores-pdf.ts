// Indicadores do mês em PDF (A4 retrato), no mesmo visual da planilha enviada à gestão.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import { desenharCarimbo } from "./carimbo";
import { EQUIPE } from "./equipe";
import { desenharLogo, PROPORCAO_LOGO } from "./logo";
import { dataPorExtenso } from "./receituario-pdf";

export type ObitoPdf = { nome: string; prontuario: string; data: string; doPrograma: boolean | null; justificativa: string };
export type DadosIndicadoresPdf = {
  emad: string;
  mes: string;
  nomeMes: string;
  obitos: ObitoPdf[];
  /** yyyy-mm-dd */
  hoje: string;
  carimbo?: string[];
};

type Cor = [number, number, number];
const LARANJA: Cor = [255, 192, 0];
const CINZA: Cor = [174, 170, 170];
const AZUL: Cor = [217, 225, 242];
const AMARELO: Cor = [255, 255, 0];
const TINTA: Cor = [20, 20, 20];

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");

export async function montarIndicadoresPdf(d: DadosIndicadoresPdf): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const [{ jsPDF }, tabela] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = tabela.default;
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({
    title: `Indicadores — ${d.nomeMes}`,
    author: `EMAD ${d.emad}`,
    subject: "Indicadores mensais",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const X0 = 15, X1 = 195, LARG = X1 - X0, MEIO = 105;
  const fonte = (tam: number, estilo: "normal" | "bold" = "normal", cor: Cor = TINTA) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(cor[0], cor[1], cor[2]);
  };

  // cabeçalho
  const larguraLogo = 44;
  desenharLogo(doc, X0, 12, larguraLogo);
  fonte(16, "bold");
  doc.text("INDICADORES", X1, 20, { align: "right" });
  fonte(11, "normal", [70, 85, 85]);
  doc.text(limpar(`${d.nomeMes} · EMAD ${d.emad} — Programa Melhor em Casa`), X1, 26.5, { align: "right" });
  fonte(8.5, "normal", [90, 100, 100]);
  const linhasEquipe = doc.splitTextToSize(limpar(EQUIPE.map(([f, n]) => `${f}: ${n}`).join(" · ")), 120) as string[];
  doc.text(linhasEquipe, X1, 32, { align: "right", lineHeightFactor: 1.35 });
  let y = 12 + larguraLogo * PROPORCAO_LOGO + 8;

  // faixa ÓBITOS (laranja, como na planilha)
  doc.setFillColor(...LARANJA);
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.35);
  doc.rect(X0, y, LARG, 10, "FD");
  fonte(14, "bold");
  doc.text("ÓBITOS", MEIO, y + 7, { align: "center" });
  y += 10;

  const sim = (v: boolean | null) => (v === true ? "Sim" : v === false ? "Não" : "—");
  const corpo = d.obitos.length
    ? d.obitos.map((o, i) => {
        const linha = [
          { content: limpar(o.nome), styles: { fontStyle: "bold" as const } },
          limpar([o.data ? `Óbito em ${o.data}` : "", `Pront. ${o.prontuario}`].filter(Boolean).join(" · ")),
          { content: sim(o.doPrograma), styles: { halign: "center" as const, fontStyle: "bold" as const } },
          limpar(o.doPrograma === false ? o.justificativa || "Justificativa não informada" : "—"),
        ];
        return i === 0
          ? [{ content: d.emad, rowSpan: d.obitos.length, styles: { fillColor: AZUL, halign: "center" as const, valign: "middle" as const, fontStyle: "bold" as const, fontSize: 13 } }, ...linha]
          : linha;
      })
    : [[
        { content: d.emad, styles: { fillColor: AZUL, halign: "center" as const, valign: "middle" as const, fontStyle: "bold" as const, fontSize: 13 } },
        { content: "Nenhum óbito registrado no mês.", colSpan: 4, styles: { halign: "center" as const, textColor: [90, 100, 100] as Cor } },
      ]];

  autoTable(doc, {
    startY: y,
    margin: { left: X0, right: 210 - X1 },
    head: [[
      { content: "EMAD", styles: { halign: "center" } },
      { content: "Paciente", colSpan: 2, styles: { halign: "center" } },
      { content: "DO fornecida pelo Programa\n(Sim ou Não)", styles: { halign: "center" } },
      { content: "Justificativa\n(se não foi fornecida)", styles: { halign: "center" } },
    ]],
    body: corpo,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 2.4, textColor: TINTA, lineColor: [40, 40, 40], lineWidth: 0.3, valign: "middle" },
    headStyles: { fillColor: CINZA, textColor: TINTA, fontStyle: "bold", fontSize: 9.5, valign: "middle" },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30, fontSize: 8.5, textColor: [70, 85, 85] },
      3: { cellWidth: 27 },
      4: { cellWidth: "auto" },
    },
    rowPageBreak: "avoid",
  });
  y = (doc as JsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // faixa amarela de orientação (como na planilha)
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  doc.setFillColor(...AMARELO);
  doc.rect(X0, y, LARG, 8, "F");
  fonte(9.5);
  const aviso = "Se caso a Declaração de óbito não tiver sido fornecida pelo Programa, justificar o motivo.";
  doc.text(aviso, MEIO, y + 5.4, { align: "center" });
  y += 8;

  // resumo
  const total = d.obitos.length;
  const fornecidas = d.obitos.filter((o) => o.doPrograma === true).length;
  const naoFornecidas = d.obitos.filter((o) => o.doPrograma === false).length;
  fonte(10, "bold");
  doc.text(
    limpar(`Total de óbitos no mês: ${total}   ·   DO fornecida pelo Programa: ${fornecidas}   ·   Não fornecida: ${naoFornecidas}` +
      (total - fornecidas - naoFornecidas ? `   ·   Sem informação: ${total - fornecidas - naoFornecidas}` : "")),
    X0, y + 9,
  );

  // data e assinatura
  const yAss = Math.max(y + 45, 245);
  fonte(10.5);
  doc.text(`Fortaleza, ${dataPorExtenso(d.hoje)}`, X0, yAss - 22);
  desenharCarimbo(doc, d.carimbo, MEIO, yAss, 90);
  doc.setDrawColor(75, 85, 85);
  doc.setLineWidth(0.25);
  doc.line(60, yAss, 150, yAss);
  fonte(9.5);
  doc.text("Responsável pelas informações", MEIO, yAss + 5, { align: "center" });

  fonte(8, "normal", [110, 120, 120]);
  doc.text(limpar(`EMAD ${d.emad} — Programa Melhor em Casa · Indicadores de ${d.nomeMes}`), MEIO, 287, { align: "center" });

  return { doc, nomeArquivo: `indicadores-emad${d.emad}-${d.mes}.pdf` };
}

export async function gerarIndicadoresPdf(d: DadosIndicadoresPdf): Promise<void> {
  const { doc, nomeArquivo } = await montarIndicadoresPdf(d);
  doc.save(nomeArquivo);
}
