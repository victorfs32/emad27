// Receituário médico do Programa Melhor em Casa: uma folha A4 com duas vias lado a lado.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";

export type DadosReceituario = {
  nome: string;
  /** Texto do(s) medicamento(s): posologia, via, quantidade… */
  medicamento: string;
  /** Data da receita (yyyy-mm-dd). */
  data: string;
};

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type Cor = [number, number, number];
const PRETO: Cor = [20, 20, 20];
const CINZA: Cor = [110, 110, 110];
const AZUL: Cor = [18, 70, 140];

export function dataPorExtenso(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1] ?? ""} de ${a}`;
}

export async function montarReceituarioPdf(d: DadosReceituario): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape", compress: true });
  doc.setProperties({
    title: `Receituário médico — ${d.nome}`,
    author: "EMAD 27",
    subject: "Receituário médico",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const fonte = (tam: number, estilo: "normal" | "bold" | "italic" = "normal", cor: Cor = PRETO) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(cor[0], cor[1], cor[2]);
  };
  const linha = (x1: number, y1: number, x2: number, y2: number, esp = 0.3) => {
    doc.setDrawColor(PRETO[0], PRETO[1], PRETO[2]);
    doc.setLineWidth(esp);
    doc.line(x1, y1, x2, y2);
  };

  const via = (x0: number, larg: number) => {
    const x1 = x0 + larg;
    const meio = x0 + larg / 2;
    // endereço do programa (esquerda) e identificação da Prefeitura (direita)
    fonte(7.4, "bold");
    doc.text(["PROGRAMA MELHOR EM CASA", "Av. Washington Soares, 7700 Messejana,", "CEP - 60844-150 FORTALEZA - CEARÁ"].map(limpar), x0, 14, { lineHeightFactor: 1.35 });
    fonte(9.5, "normal", CINZA);
    doc.text("Prefeitura de", x1, 13, { align: "right" });
    fonte(17, "bold", AZUL);
    doc.text("Fortaleza", x1, 20, { align: "right" });
    fonte(5.6, "normal", CINZA);
    doc.text("Secretaria Municipal da Saúde", x1, 23.5, { align: "right" });

    fonte(11, "normal");
    doc.text("RECEITUÁRIO MÉDICO", meio, 36, { align: "center" });

    // nome do paciente
    fonte(9, "normal");
    doc.text("NOME:", x0, 47);
    const larguraNome = larg - 15;
    fonte(10.5, "bold");
    const nome = (doc.splitTextToSize(limpar(d.nome), larguraNome) as string[]).slice(0, 2);
    doc.text(nome, x0 + 14, 46.4, { lineHeightFactor: 1.2 });
    linha(x0 + 13, 48 + (nome.length - 1) * 4.6, x1, 48 + (nome.length - 1) * 4.6);

    // medicamento(s)
    fonte(11, "normal");
    const texto = doc.splitTextToSize(limpar(d.medicamento), larg - 2) as string[];
    doc.text(texto.slice(0, 22), x0 + 1, 62, { lineHeightFactor: 1.5 });

    // data e assinatura
    fonte(9.5, "normal");
    doc.text(`Fortaleza, ${dataPorExtenso(d.data)}`, x0, 168);
    linha(x0 + 8, 182, x1 - 8, 182);
    fonte(9.5, "normal");
    doc.text("Assinatura do(a) Médico(a)/CRM", meio, 187, { align: "center" });

    fonte(7.6, "normal");
    doc.text(["Programa Melhor em Casa", "Avenida Washington Soares - 7700 - CEP 60844-150"], meio, 197, { align: "center", lineHeightFactor: 1.35 });
  };

  via(8, 134);
  via(155, 134);
  // divisória pontilhada entre as duas vias
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(148.5, 6, 148.5, 204);
  doc.setLineDashPattern([], 0);

  return { doc, nomeArquivo: `receituario-${slug(d.nome) || "paciente"}-${d.data}.pdf` };
}

export async function gerarReceituarioPdf(d: DadosReceituario): Promise<void> {
  const { doc, nomeArquivo } = await montarReceituarioPdf(d);
  doc.save(nomeArquivo);
}
