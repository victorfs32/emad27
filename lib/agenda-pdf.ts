// Agenda mensal de visitas em PDF (A4 paisagem), para enviar à gestão.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import type { Agenda } from "./agenda";
import { EQUIPE } from "./equipe";
import { desenharLogo, PROPORCAO_LOGO } from "./logo";

export const NOMES_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const ddmm = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

export async function montarAgendaPdf(
  a: Agenda, d: { mes: string; nomeMes: string; meta: number; geradoEm: string },
): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const [{ jsPDF }, tabela] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = tabela.default;
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape", compress: true });
  doc.setProperties({
    title: `Agenda de visitas — ${d.nomeMes}`,
    author: "EMAD 27",
    subject: "Agenda mensal de visitas domiciliares",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const X0 = 10, X1 = 287;
  const larguraLogo = 34;
  const topoTabela = 7 + larguraLogo * PROPORCAO_LOGO + 9;

  const cabecalho = () => {
    desenharLogo(doc, X0, 7, larguraLogo);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.text(limpar(`AGENDA DE VISITAS DOMICILIARES — ${d.nomeMes.toUpperCase()}`), X1, 13, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70, 85, 85);
    doc.text(
      limpar(`EMAD 27 — Programa Melhor em Casa · Meta: ${d.meta} visitas · Previstas: ${a.previstas} · Realizadas: ${a.realizadas} · ` +
        `Dias de atendimento: ${a.diasAtendimento} · Pacientes ativos: ${a.pacientes}`),
      X1, 18.5, { align: "right" },
    );
    doc.setFontSize(8.5);
    doc.text(limpar(`Equipe — ${EQUIPE.map(([f, n]) => `${f}: ${n}`).join(" · ")}`), X1, 23.5, { align: "right" });
  };

  const linhas = a.dias.filter((x) => (x.util && !x.passado) || x.folga || x.itens.length > 0);
  autoTable(doc, {
    startY: topoTabela,
    margin: { left: X0, right: 297 - X1, top: topoTabela, bottom: 14 },
    head: [["Data", "Dia", "Bairro(s)", "Pacientes", "Qtd."]],
    body: linhas.map((x) => [
      ddmm(x.iso),
      NOMES_DIA[x.dow],
      x.folga ? "Sem atendimento" : limpar(x.bairros.join(" + ") || "—"),
      x.folga && !x.itens.length
        ? "—"
        : limpar(x.itens.map((p, i) => `${i + 1}. ${p.nome} (pront. ${p.prontuario} · CNS ${p.cns || "não informado"})${p.endereco ? ` — ${p.endereco}` : ""}${p.realizada ? " [visitado]" : ""}`).join("\n")),
      x.folga && !x.itens.length ? "—" : String(x.itens.length),
    ]),
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.6, cellPadding: 1.6, textColor: [20, 20, 20], lineColor: [190, 200, 200], lineWidth: 0.2, valign: "top" },
    headStyles: { fillColor: [29, 111, 87], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: [244, 248, 247] },
    columnStyles: {
      0: { cellWidth: 14, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 20 },
      2: { cellWidth: 48, fontStyle: "bold" },
      3: { cellWidth: "auto" },
      4: { cellWidth: 12, halign: "center" },
    },
    rowPageBreak: "avoid",
    didDrawPage: () => {
      cabecalho();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 120, 120);
      doc.text(limpar(`Gerado em ${d.geradoEm} · [visitado] = visita já registrada no sistema · Agenda gerada automaticamente: pacientes agrupados por bairro, sem repetir até todos serem visitados.`), X0, 203);
      doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, X1, 203, { align: "right" });
    },
  });

  return { doc, nomeArquivo: `agenda-visitas-${d.mes}.pdf` };
}

export async function gerarAgendaPdf(a: Agenda, d: { mes: string; nomeMes: string; meta: number; geradoEm: string }): Promise<void> {
  const { doc, nomeArquivo } = await montarAgendaPdf(a, d);
  doc.save(nomeArquivo);
}
