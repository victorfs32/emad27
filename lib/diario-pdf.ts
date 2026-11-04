// Diário de atendimentos em PDF (A4 paisagem), no desenho da folha "Ocorrência - EMAD".
// PDF do dia ou do mês (um dia por folha e o resumo do mês no fim). Roda no navegador.
import type { jsPDF as JsPDF } from "jspdf";
import type { CellInput, UserOptions } from "jspdf-autotable";
import {
  FUNCOES_EQUIPE, PROCEDIMENTOS_DIARIO, PROFISSIONAIS, SINAIS, TURNOS, totais, type Atendimento, type DiaDiario,
} from "./diario-opcoes";
import { desenharLogo, PROPORCAO_LOGO } from "./logo";

type Cor = [number, number, number];
type AutoTable = typeof import("jspdf-autotable").default;
const TINTA: Cor = [20, 20, 20];
const CINZA: Cor = [217, 217, 217];
const ESCURO: Cor = [166, 166, 166];
const X0 = 10, X1 = 287, LARG = X1 - X0;

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const ddmmaaaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const diaSemana = (iso: string) => SEMANA[new Date(`${iso}T12:00:00Z`).getUTCDay()];

function fonte(doc: JsPDF, tam: number, estilo: "normal" | "bold" = "normal", cor: Cor = TINTA) {
  doc.setFont("helvetica", estilo);
  doc.setFontSize(tam);
  doc.setTextColor(cor[0], cor[1], cor[2]);
}

/** Uma folha do dia: cabeçalho, equipe, atendimentos (manhã e tarde) e intercorrências. */
function desenharDia(doc: JsPDF, autoTable: AutoTable, dia: DiaDiario | null, data: string, lista: Atendimento[]) {
  // cabeçalho
  fonte(doc, 13, "bold");
  doc.text("OCORRÊNCIA - EMAD 27", X0, 14);
  fonte(doc, 13, "bold");
  doc.text(`DATA: ${ddmmaaaa(data)}`, X1 - 40, 14, { align: "right" });
  fonte(doc, 9, "normal", [70, 85, 85]);
  doc.text(diaSemana(data), X1 - 40, 18.5, { align: "right" });
  fonte(doc, 7.5, "bold");
  doc.text([
    "PREFEITURA MUNICIPAL DE FORTALEZA", "SECRETARIA MUNICIPAL DE SAÚDE",
    "EQUIPE MULTIPROFISSIONAL DE ATENDIMENTO DOMICILIAR - EMAD", "EQUIPE MULTIPROFISSIONAL DE APOIO - EMAP",
  ], X0, 19, { lineHeightFactor: 1.3 });
  desenharLogo(doc, X1 - 34, 7, 34);
  let y = Math.max(32, 7 + 34 * PROPORCAO_LOGO + 2);

  // equipe do dia
  const eq = dia?.equipe ?? { manha: {}, tarde: {} };
  // Equipe deitada (funções nas colunas, manhã e tarde nas linhas) para caber o dia inteiro numa folha.
  const larguraFuncao = (LARG - 16.5) / FUNCOES_EQUIPE.length;
  autoTable(doc, {
    startY: y,
    margin: { left: X0, right: 297 - X1 },
    head: [["EQUIPE", ...FUNCOES_EQUIPE.map((f) => f.rotulo.toUpperCase())]],
    body: TURNOS.map((t) => [t.rotulo.toUpperCase(), ...FUNCOES_EQUIPE.map((f) => limpar(eq[t.valor]?.[f.valor] ?? ""))]),
    theme: "grid",
    styles: { font: "helvetica", fontSize: 7, cellPadding: 0.8, textColor: TINTA, lineColor: [40, 40, 40], lineWidth: 0.2, valign: "middle" },
    headStyles: { fillColor: CINZA, textColor: TINTA, fontStyle: "bold", halign: "center", fontSize: 6.8 },
    columnStyles: Object.fromEntries([[0, { cellWidth: "auto", fontStyle: "bold" }], ...FUNCOES_EQUIPE.map((_, i) => [i + 1, { cellWidth: larguraFuncao }])]),
  });
  y = (doc as JsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;

  // registro diário de atendimentos
  const nProc = PROCEDIMENTOS_DIARIO.length;
  const larguraProc = 5.3;
  const fixas = [6, 0, 14, 8.5, 8.5, 9, 9, 9, 5, 5, 5, 6]; // nº, paciente (resto), PA, FC, FR, TA, DX, SpO2, M, F, E, TE
  const paciente = LARG - 2 - fixas.reduce((s, v) => s + v, 0) - nProc * larguraProc;
  const larguras = [6, paciente, ...fixas.slice(2), ...Array(nProc).fill(larguraProc)];
  const nCols = larguras.length;
  const PRIMEIRA_PROC = 12;

  const X = (v: boolean) => (v ? "X" : "");
  const corpo: CellInput[][] = [];
  for (const t of TURNOS) {
    const doTurno = lista.filter((a) => a.turno === t.valor);
    corpo.push([{ content: t.rotulo.toUpperCase(), colSpan: nCols, styles: { fillColor: CINZA, fontStyle: "bold" as const, halign: "center" as const } }]);
    if (!doTurno.length) {
      corpo.push(["", { content: "Nenhum atendimento registrado.", colSpan: nCols - 1, styles: { textColor: [110, 120, 120] } }]);
    }
    doTurno.forEach((a, i) => corpo.push([
      String(i + 1), limpar(a.paciente),
      ...SINAIS.map((s) => limpar(a[s.valor] ?? "")),
      ...PROFISSIONAIS.map((p) => X(a.profissionais.includes(p.valor))),
      ...PROCEDIMENTOS_DIARIO.map((p) => X(a.procedimentos.includes(p.valor))),
    ]));
    const tt = totais(doTurno);
    corpo.push([
      { content: `TOTAL ${t.rotulo.toUpperCase()}: ${tt.atendimentos} atendimento(s)`, colSpan: 8, styles: { fontStyle: "bold" as const, halign: "right" as const, fillColor: ESCURO } },
      ...PROFISSIONAIS.map((p) => ({ content: tt.prof[p.valor] ? String(tt.prof[p.valor]) : "", styles: { fontStyle: "bold" as const, fillColor: ESCURO } })),
      ...PROCEDIMENTOS_DIARIO.map((p) => ({ content: tt.proc[p.valor] ? String(tt.proc[p.valor]) : "", styles: { fontStyle: "bold" as const, fillColor: ESCURO } })),
    ]);
  }

  const opcoes: UserOptions = {
    startY: y,
    margin: { left: X0, right: 297 - X1, top: 12, bottom: 12 },
    head: [[
      { content: "Nº", styles: { halign: "center" as const } }, { content: "PACIENTE" },
      ...SINAIS.map((s) => ({ content: s.rotulo, styles: { halign: "center" as const } })),
      ...PROFISSIONAIS.map((p) => ({ content: p.valor, styles: { halign: "center" as const } })),
      ...PROCEDIMENTOS_DIARIO.map(() => ({ content: "" })),
    ]],
    body: corpo,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 6.8, cellPadding: 0.7, textColor: TINTA, lineColor: [40, 40, 40], lineWidth: 0.2, valign: "middle", halign: "center", overflow: "linebreak" },
    headStyles: { fillColor: CINZA, textColor: TINTA, fontStyle: "bold", valign: "bottom", minCellHeight: 37 },
    columnStyles: Object.fromEntries(larguras.map((w, i) => [i, { cellWidth: i === 1 ? "auto" : w, halign: i === 1 ? "left" : "center" }])),
    didDrawCell: (h) => {
      // títulos dos procedimentos na vertical, como na folha
      if (h.section === "head" && h.column.index >= PRIMEIRA_PROC) {
        const p = PROCEDIMENTOS_DIARIO[h.column.index - PRIMEIRA_PROC];
        fonte(doc, 6, "bold");
        doc.text(limpar(p.rotulo), h.cell.x + h.cell.width / 2 + 1.1, h.cell.y + h.cell.height - 1.5, { angle: 90 });
      }
    },
    rowPageBreak: "avoid",
  };
  autoTable(doc, opcoes);
  y = (doc as JsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // intercorrências / anotações
  const texto = dia?.anotacoes?.trim() ?? "";
  if (y > 188) {
    doc.addPage();
    y = 14;
  }
  fonte(doc, 8, "bold");
  doc.text("INTERCORRÊNCIAS/ANOTAÇÕES:", X0, y);
  fonte(doc, 8);
  const linhas = doc.splitTextToSize(limpar(texto || "—"), LARG) as string[];
  let yy = y + 4;
  for (const l of linhas) {
    if (yy > 200) {
      doc.addPage();
      yy = 14;
    }
    doc.text(l, X0, yy);
    yy += 3.6;
  }
}

/** Resumo do mês: atendimentos e procedimentos por turno. */
function desenharResumo(doc: JsPDF, autoTable: AutoTable, nomeMes: string, lista: Atendimento[], diasComRegistro: number) {
  fonte(doc, 14, "bold");
  doc.text(limpar(`RESUMO DO MÊS — ${nomeMes.toUpperCase()}`), X0, 16);
  fonte(doc, 9, "normal", [70, 85, 85]);
  doc.text("EMAD 27 — Programa Melhor em Casa · Registro diário de atendimentos", X0, 22);
  desenharLogo(doc, X1 - 34, 7, 34);
  const m = totais(lista.filter((a) => a.turno === "manha"));
  const t = totais(lista.filter((a) => a.turno === "tarde"));
  const linha = (rotulo: string, a: number, b: number) => [limpar(rotulo), String(a), String(b), String(a + b)];
  autoTable(doc, {
    startY: 30,
    margin: { left: X0, right: 297 - 195 },
    head: [["", "Manhã", "Tarde", "Total"]],
    body: [
      linha("Atendimentos", m.atendimentos, t.atendimentos),
      ...PROFISSIONAIS.map((p) => linha(`Atendimentos com ${p.rotulo.toLowerCase()} (${p.valor})`, m.prof[p.valor], t.prof[p.valor])),
      ...PROCEDIMENTOS_DIARIO.map((p) => linha(p.rotulo, m.proc[p.valor], t.proc[p.valor])),
    ],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 1, textColor: TINTA, lineColor: [40, 40, 40], lineWidth: 0.2 },
    headStyles: { fillColor: CINZA, textColor: TINTA, fontStyle: "bold", halign: "center" },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 25, halign: "center" }, 2: { cellWidth: 25, halign: "center" }, 3: { cellWidth: 25, halign: "center", fontStyle: "bold" } },
    didParseCell: (h) => {
      if (h.section === "body" && h.row.index === 0) h.cell.styles.fontStyle = "bold";
    },
  });
  const y = (doc as JsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  fonte(doc, 9, "bold");
  doc.text(`Dias com registro: ${diasComRegistro}`, X0, y);
}

function rodape(doc: JsPDF, titulo: string, geradoEm: string) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    fonte(doc, 7, "normal", [110, 120, 120]);
    doc.text(limpar(`EMAD 27 — Programa Melhor em Casa · ${titulo} · gerado em ${geradoEm}`), 148.5, 205, { align: "center" });
    if (n > 1) doc.text(`${i}/${n}`, X1, 205, { align: "right" });
  }
}

async function novoDoc(titulo: string) {
  const [{ jsPDF }, tabela] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape", compress: true });
  doc.setProperties({ title: titulo, author: "EMAD 27", subject: "Registro diário de atendimentos", creator: "EMAD 27 — Programa Melhor em Casa" });
  return { doc, autoTable: tabela.default };
}

const agora = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short" });

export async function montarDiaPdf(dia: DiaDiario | null, data: string, lista: Atendimento[], geradoEm = agora()) {
  const { doc, autoTable } = await novoDoc(`Ocorrência EMAD 27 — ${ddmmaaaa(data)}`);
  desenharDia(doc, autoTable, dia, data, lista);
  rodape(doc, `Ocorrência de ${ddmmaaaa(data)}`, geradoEm);
  return { doc, nomeArquivo: `ocorrencia-emad27-${data}.pdf` };
}

export async function montarMesPdf(mes: string, nomeMes: string, dias: DiaDiario[], lista: Atendimento[], geradoEm = agora()) {
  const { doc, autoTable } = await novoDoc(`Ocorrências EMAD 27 — ${nomeMes}`);
  const datas = [...new Set([...dias.map((d) => d.data), ...lista.map((a) => a.data)])].sort();
  datas.forEach((data, i) => {
    if (i > 0) doc.addPage();
    desenharDia(doc, autoTable, dias.find((d) => d.data === data) ?? null, data, lista.filter((a) => a.data === data));
  });
  if (datas.length) doc.addPage();
  desenharResumo(doc, autoTable, nomeMes, lista, datas.length);
  rodape(doc, `Ocorrências de ${nomeMes}`, geradoEm);
  return { doc, nomeArquivo: `ocorrencias-emad27-${mes}.pdf` };
}
