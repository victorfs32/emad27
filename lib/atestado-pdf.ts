// Atestado médico do Programa Melhor em Casa (A4 retrato, uma via).
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import { dataPorExtenso } from "./receituario-pdf";

export type DadosAtestado = {
  nome: string;
  /** Texto do atestado escrito pelo médico. */
  texto: string;
  /** yyyy-mm-dd */
  data: string;
};

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function montarAtestadoPdf(d: DadosAtestado): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({
    title: `Atestado médico — ${d.nome}`,
    author: "EMAD 27",
    subject: "Atestado médico",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const X0 = 22, X1 = 188, MEIO = 105;
  const fonte = (tam: number, estilo: "normal" | "bold" = "normal", cor: [number, number, number] = [20, 20, 20]) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(cor[0], cor[1], cor[2]);
  };
  const linha = (x1: number, y1: number, x2: number, y2: number, esp = 0.3) => {
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(esp);
    doc.line(x1, y1, x2, y2);
  };

  // moldura da folha
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.3);
  doc.rect(12, 14, 186, 258);

  // identificação da Prefeitura (logotipo em texto provisório)
  fonte(15, "bold");
  doc.text("Prefeitura de", X1, 30, { align: "right" });
  fonte(26, "bold", [18, 70, 140]);
  doc.text("Fortaleza", X1, 41, { align: "right" });
  fonte(7, "bold", [18, 70, 140]);
  doc.text("Secretaria Municipal da Saúde", X1, 46, { align: "right" });

  fonte(13);
  doc.text("ATESTADO MÉDICO", MEIO, 68, { align: "center" });

  fonte(11);
  doc.text("NOME:", X0, 86);
  fonte(12, "bold");
  doc.text(limpar(d.nome), X0 + 17, 85.4);
  linha(X0 + 15, 87, X1, 87);

  // texto do atestado
  fonte(12);
  const corpo = (doc.splitTextToSize(limpar(d.texto), X1 - X0) as string[]).slice(0, 26);
  doc.text(corpo, X0, 102, { lineHeightFactor: 1.7 });

  // data e assinatura
  fonte(11);
  doc.text(`Fortaleza, ${dataPorExtenso(d.data)}`, X0, 228);
  linha(60, 247, 150, 247);
  doc.text("Assinatura do(a) Médico(a)/CRM", MEIO, 253, { align: "center" });

  fonte(9, "bold");
  doc.text(["Hospital Distrital Gonzaga Mota de Messejana", "Avenida Washington Soares - 7700 - CEP.60844-150"], MEIO, 281, { align: "center", lineHeightFactor: 1.4 });

  return { doc, nomeArquivo: `atestado-${slug(d.nome) || "paciente"}-${d.data}.pdf` };
}

export async function gerarAtestadoPdf(d: DadosAtestado): Promise<void> {
  const { doc, nomeArquivo } = await montarAtestadoPdf(d);
  doc.save(nomeArquivo);
}
