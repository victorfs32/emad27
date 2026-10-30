// Indicadores do mês em PDF (A4 retrato), um arquivo por quadro, no mesmo visual das planilhas enviadas à gestão.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import { desenharCarimbo } from "./carimbo";
import { EQUIPE } from "./equipe";
import { DIAS_REINTERNACAO, ROTULO_OBITO, TIPOS_ALTA } from "./indicadores-opcoes";
import { desenharLogo, PROPORCAO_LOGO } from "./logo";
import { dataPorExtenso } from "./receituario-pdf";

type Cor = [number, number, number];
const LARANJA: Cor = [255, 192, 0];
const AMARELO: Cor = [255, 255, 0];
const TINTA: Cor = [20, 20, 20];
const APAGADO: Cor = [90, 100, 100];

/** Dados comuns a todos os quadros. Datas já formatadas (dd/mm/aaaa), exceto hoje (aaaa-mm-dd). */
export type Comum = { emad: string; mes: string; nomeMes: string; hoje: string; carimbo?: string[] };

type Coluna = { titulo: string; largura?: number; centro?: boolean; negrito?: boolean; pequeno?: boolean };
type Quadro = {
  titulo: string;
  arquivo: string;
  corCabecalho: Cor;
  corEmad: Cor;
  colunas: Coluna[];
  linhas: string[][];
  vazio: string;
  vazioDestaque?: boolean;
  nota?: string;
  legenda?: { titulo: string; itens: string[] };
  resumo?: string;
};

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");

type AutoTable = typeof import("jspdf-autotable").default;

async function novoDoc(titulo: string, d: Comum) {
  const [{ jsPDF }, tabela] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({ title: `${titulo} — ${d.nomeMes}`, author: `EMAD ${d.emad}`, subject: "Indicadores mensais", creator: "EMAD 27 — Programa Melhor em Casa" });
  return { doc, autoTable: tabela.default };
}

/** Desenha um quadro começando na página atual do documento; devolve a última página usada. */
function desenharQuadro(doc: JsPDF, autoTable: AutoTable, q: Quadro, d: Comum, comAssinatura: boolean): number {
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
  fonte(8.5, "normal", APAGADO);
  const equipe = doc.splitTextToSize(limpar(EQUIPE.map(([f, n]) => `${f}: ${n}`).join(" · ")), 120) as string[];
  doc.text(equipe, X1, 32, { align: "right", lineHeightFactor: 1.35 });
  let y = 12 + larguraLogo * PROPORCAO_LOGO + 8;

  // faixa laranja com o título do quadro (como na planilha)
  doc.setFillColor(...LARANJA);
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.35);
  doc.rect(X0, y, LARG, 10, "FD");
  fonte(q.titulo.length > 40 ? 11.5 : 14, "bold");
  doc.text(limpar(q.titulo), MEIO, y + 6.8, { align: "center" });
  y += 10;

  const emad = { content: d.emad, styles: { fillColor: q.corEmad, halign: "center" as const, valign: "middle" as const, fontStyle: "bold" as const, fontSize: 13 } };
  const corpo = q.linhas.length
    ? q.linhas.map((l, i) => (i === 0 ? [{ ...emad, rowSpan: q.linhas.length }, ...l.map(limpar)] : l.map(limpar)))
    : [[emad, {
        content: limpar(q.vazio), colSpan: q.colunas.length,
        styles: { halign: "center" as const, fontStyle: (q.vazioDestaque ? "bold" : "normal") as "bold" | "normal", textColor: q.vazioDestaque ? TINTA : APAGADO },
      }]];

  autoTable(doc, {
    startY: y,
    margin: { left: X0, right: 210 - X1, top: 18 },
    head: [[{ content: "EMAD", styles: { halign: "center" } }, ...q.colunas.map((c) => ({ content: c.titulo, styles: { halign: c.centro ? "center" as const : "left" as const } }))]],
    body: corpo,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 2.4, textColor: TINTA, lineColor: [40, 40, 40], lineWidth: 0.3, valign: "middle" },
    headStyles: { fillColor: q.corCabecalho, textColor: TINTA, fontStyle: "bold", fontSize: 9.5, valign: "middle" },
    columnStyles: Object.fromEntries([
      [0, { cellWidth: 20 }],
      ...q.colunas.map((c, i) => [i + 1, {
        cellWidth: c.largura ?? "auto",
        halign: c.centro ? "center" : "left",
        fontStyle: c.negrito ? "bold" : "normal",
        ...(c.pequeno ? { fontSize: 8.5, textColor: [70, 85, 85] } : {}),
      }]),
    ]),
    rowPageBreak: "avoid",
  });
  y = (doc as JsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  const garantir = (altura: number) => {
    if (y + altura > 270) {
      doc.addPage();
      y = 20;
    }
  };

  // faixa amarela de orientação
  if (q.nota) {
    garantir(10);
    doc.setFillColor(...AMARELO);
    fonte(9.5);
    const linhas = doc.splitTextToSize(limpar(q.nota), LARG - 6) as string[];
    const h = 4 + linhas.length * 4.4;
    doc.rect(X0, y, LARG, h, "F");
    doc.text(linhas, MEIO, y + 5.3, { align: "center", lineHeightFactor: 1.3 });
    y += h + 4;
  }

  // legenda (ex.: tipos de alta)
  if (q.legenda) {
    garantir(8 + q.legenda.itens.length * 6);
    autoTable(doc, {
      startY: y,
      margin: { left: X0, right: 210 - X1 },
      body: q.legenda.itens.map((it, i) => (i === 0
        ? [{ content: limpar(q.legenda!.titulo), rowSpan: q.legenda!.itens.length, styles: { fontStyle: "bold" as const, halign: "center" as const, valign: "middle" as const } }, limpar(it)]
        : [limpar(it)])),
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 1.8, textColor: TINTA, lineColor: [40, 40, 40], lineWidth: 0.25 },
      columnStyles: { 0: { cellWidth: 38 } },
    });
    y = (doc as JsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  if (q.resumo) {
    garantir(10);
    fonte(10, "bold");
    const linhas = doc.splitTextToSize(limpar(q.resumo), LARG) as string[];
    doc.text(linhas, X0, y + 4, { lineHeightFactor: 1.35 });
    y += 4 + linhas.length * 5;
  }

  if (!comAssinatura) return doc.getNumberOfPages();

  // data e assinatura
  garantir(45);
  const yAss = Math.max(y + 38, 245);
  fonte(10.5);
  doc.text(`Fortaleza, ${dataPorExtenso(d.hoje)}`, X0, yAss - 22);
  desenharCarimbo(doc, d.carimbo, MEIO, yAss, 90);
  doc.setDrawColor(75, 85, 85);
  doc.setLineWidth(0.25);
  doc.line(60, yAss, 150, yAss);
  fonte(9.5);
  doc.text("Responsável pelas informações", MEIO, yAss + 5, { align: "center" });
  return doc.getNumberOfPages();
}

/** Rodapé em todas as páginas: título do quadro daquela página e numeração. */
function rodape(doc: JsPDF, d: Comum, tituloDaPagina: (p: number) => string) {
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 120, 120);
    doc.text(limpar(`EMAD ${d.emad} — Programa Melhor em Casa · ${tituloDaPagina(p)} · ${d.nomeMes}`), 105, 287, { align: "center" });
    if (paginas > 1) doc.text(`${p}/${paginas}`, 195, 287, { align: "right" });
  }
}

async function montarQuadro(q: Quadro, d: Comum): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { doc, autoTable } = await novoDoc(q.titulo, d);
  desenharQuadro(doc, autoTable, q, d, true);
  rodape(doc, d, () => q.titulo);
  return { doc, nomeArquivo: `${q.arquivo}-emad${d.emad}-${d.mes}.pdf` };
}

/** Todos os quadros num PDF só: cada quadro começa numa página nova; data e assinatura no fim. */
async function montarTodos(quadros: Quadro[], d: Comum): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { doc, autoTable } = await novoDoc("Indicadores", d);
  const fimDe: number[] = [];
  quadros.forEach((q, i) => {
    if (i > 0) doc.addPage();
    fimDe.push(desenharQuadro(doc, autoTable, q, d, i === quadros.length - 1));
  });
  rodape(doc, d, (p) => quadros[fimDe.findIndex((f) => p <= f)]?.titulo ?? "Indicadores");
  return { doc, nomeArquivo: `indicadores-emad${d.emad}-${d.mes}.pdf` };
}

async function baixar(q: Quadro, d: Comum) {
  const { doc, nomeArquivo } = await montarQuadro(q, d);
  doc.save(nomeArquivo);
}

async function baixarTodos(quadros: Quadro[], d: Comum) {
  const { doc, nomeArquivo } = await montarTodos(quadros, d);
  doc.save(nomeArquivo);
}

const simNao = (v: boolean | null) => (v === true ? "Sim" : v === false ? "Não" : "—");

// ------------------------------------------------------------------ quadros

export type ObitoPdf = { nome: string; prontuario: string; data: string; doPrograma: boolean | null; justificativa: string };
export function quadroObitos(lista: ObitoPdf[]): Quadro {
  const fornecidas = lista.filter((o) => o.doPrograma === true).length;
  const nao = lista.filter((o) => o.doPrograma === false).length;
  const semInfo = lista.length - fornecidas - nao;
  return {
    titulo: "ÓBITOS", arquivo: "obitos", corCabecalho: [174, 170, 170], corEmad: [217, 225, 242],
    colunas: [
      { titulo: "Paciente", largura: 52, negrito: true },
      { titulo: "Data do óbito", largura: 26, centro: true, pequeno: true },
      { titulo: "DO fornecida pelo Programa\n(Sim ou Não)", largura: 32, centro: true, negrito: true },
      { titulo: "Justificativa\n(se não foi fornecida)" },
    ],
    linhas: lista.map((o) => [`${o.nome}\nPront. ${o.prontuario}`, o.data || "—", simNao(o.doPrograma), o.doPrograma === false ? o.justificativa || "Justificativa não informada" : "—"]),
    vazio: "Nenhum óbito registrado no mês.",
    nota: "Se caso a Declaração de óbito não tiver sido fornecida pelo Programa, justificar o motivo.",
    resumo: `Total de óbitos no mês: ${lista.length}  ·  DO fornecida pelo Programa: ${fornecidas}  ·  Não fornecida: ${nao}${semInfo ? `  ·  Sem informação: ${semInfo}` : ""}`,
  };
}

export type Ad1Pdf = { nome: string; prontuario: string; motivo: string };
export function quadroAd1(lista: Ad1Pdf[]): Quadro {
  return {
    titulo: "ACOMPANHAMENTO DE PACIENTES AD1", arquivo: "acompanhamento-ad1", corCabecalho: [166, 166, 166], corEmad: [217, 217, 217],
    colunas: [
      { titulo: "Nome do paciente", largura: 62, negrito: true },
      { titulo: "AD1", largura: 16, centro: true },
      { titulo: "Motivo da permanência do paciente no Programa" },
    ],
    linhas: lista.map((p) => [`${p.nome}\nPront. ${p.prontuario}`, "AD1", p.motivo || "Motivo não informado"]),
    vazio: "Nenhum paciente AD1 em acompanhamento.",
    nota: "Exemplos de motivo da permanência: uso de dispositivo (SVD, SVA, cistostomia, GTT, TQT…); judicializado; uso de cama hospitalar ou oxigênio do Programa; lesão por pressão; paciente paliativo; reabilitação; aguardando angioplastia.",
    resumo: `Pacientes AD1 em acompanhamento: ${lista.length}`,
  };
}

export type ReinternacaoPdf = { nome: string; prontuario: string; admissao: string; data: string; motivo: string };
export function quadroReinternacao(lista: ReinternacaoPdf[], foraDoPrazo: number): Quadro {
  return {
    titulo: `REINTERNAÇÃO (ATÉ ${DIAS_REINTERNACAO} DIAS APÓS ADMISSÃO HOSPITALAR)`, arquivo: "reinternacao",
    corCabecalho: [244, 177, 131], corEmad: [255, 242, 204],
    colunas: [
      { titulo: "Paciente", largura: 50, negrito: true },
      { titulo: "Data de Admissão", largura: 26, centro: true },
      { titulo: "Data de Reinternação", largura: 28, centro: true },
      { titulo: "Motivo da Reinternação" },
    ],
    linhas: lista.map((r) => [`${r.nome}\nPront. ${r.prontuario}`, r.admissao || "—", r.data, r.motivo || "—"]),
    vazio: "Nenhuma reinternação no mês.",
    nota: `Contar como Reinternação os pacientes que voltaram para o hospital até ${DIAS_REINTERNACAO} dias após Desospitalização.`,
    resumo: `Reinternações até ${DIAS_REINTERNACAO} dias: ${lista.length}` +
      (foraDoPrazo ? `  ·  ${foraDoPrazo} reinternação(ões) com mais de ${DIAS_REINTERNACAO} dias da admissão não entra(m) no indicador.` : ""),
  };
}

export type BuscaAtivaPdf = { paciente: string; situacao: "elegivel" | "inelegivel" };
export function quadroBuscaAtiva(lista: BuscaAtivaPdf[]): Quadro {
  const eleg = lista.filter((b) => b.situacao === "elegivel").length;
  return {
    titulo: "BUSCA ATIVA", arquivo: "busca-ativa", corCabecalho: [166, 166, 166], corEmad: [191, 191, 191],
    colunas: [
      { titulo: "Paciente", negrito: true },
      { titulo: "Situação", largura: 60, centro: true },
    ],
    linhas: lista.map((b) => [b.paciente, b.situacao === "elegivel" ? "ELEGÍVEL" : "INELEGÍVEL"]),
    vazio: "NÃO HOUVE BUSCA ATIVA",
    vazioDestaque: true,
    nota: "Caso não tenha ocorrido Busca Ativa durante o mês, sinalizar como: NÃO HOUVE BUSCA ATIVA",
    resumo: lista.length ? `Total de buscas ativas: ${lista.length}  ·  Elegíveis: ${eleg}  ·  Inelegíveis: ${lista.length - eleg}` : undefined,
  };
}

export type AltaPdf = { nome: string; prontuario: string; data: string; tipo: string; motivo: string };
export function quadroAltas(lista: AltaPdf[]): Quadro {
  const contagem = [...TIPOS_ALTA.map((t) => t.rotulo), ROTULO_OBITO]
    .map((r) => [r, lista.filter((a) => a.tipo === r).length] as const).filter(([, n]) => n > 0)
    .map(([r, n]) => `${r}: ${n}`).join("  ·  ");
  return {
    titulo: "ALTAS", arquivo: "altas", corCabecalho: [173, 185, 202], corEmad: [198, 224, 180],
    colunas: [
      { titulo: "Paciente", largura: 62, negrito: true },
      { titulo: "Data", largura: 22, centro: true },
      { titulo: "Motivo" },
    ],
    linhas: lista.map((a) => [`${a.nome}\nPront. ${a.prontuario}`, a.data, [a.tipo || "Tipo de alta não informado", a.motivo].filter(Boolean).join("\n")]),
    vazio: "Nenhuma alta no mês.",
    legenda: { titulo: "TIPOS DE ALTA:", itens: [...TIPOS_ALTA.map((t) => t.rotulo), ROTULO_OBITO] },
    resumo: `Total de altas no mês: ${lista.length}${contagem ? `  ·  ${contagem}` : ""}`,
  };
}

export const montarIndicadorPdf = montarQuadro;
export const baixarIndicadorPdf = baixar;
export const montarTodosIndicadoresPdf = montarTodos;
export const baixarTodosIndicadoresPdf = baixarTodos;
export type { Quadro };
