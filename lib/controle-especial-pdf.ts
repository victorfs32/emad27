// Receituário de controle especial (1ª via farmácia / 2ª via paciente) do Programa Melhor em Casa.
// Folha A4 com duas vias lado a lado. Roda no navegador (a biblioteca de PDF é carregada só no clique).
import type { jsPDF as JsPDF } from "jspdf";
import { desenharCarimbo } from "./carimbo";
import { dataPorExtenso } from "./receituario-pdf";

export const CNPJ_PROGRAMA = "61.699.567/0093-00";
export const LINHAS_PRESCRICAO = 9;

export type DadosControleEspecial = {
  nome: string;
  endereco: string;
  /** Texto da prescrição (uma linha de texto por linha pautada). */
  prescricao: string;
  /** yyyy-mm-dd */
  data: string;
  carimbo?: string[];
};

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type Cor = [number, number, number];
const PRETO: Cor = [20, 20, 20];
const CINZA: Cor = [110, 110, 110];
const AZUL: Cor = [18, 70, 140];

export async function montarControleEspecialPdf(d: DadosControleEspecial): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape", compress: true });
  doc.setProperties({
    title: `Receituário de controle especial — ${d.nome}`,
    author: "EMAD 27",
    subject: "Receituário de controle especial",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const fonte = (tam: number, estilo: "normal" | "bold" = "normal", cor: Cor = PRETO) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(cor[0], cor[1], cor[2]);
  };
  const linha = (x1: number, y1: number, x2: number, y2: number, esp = 0.18) => {
    doc.setDrawColor(75, 85, 85);
    doc.setLineWidth(esp);
    doc.line(x1, y1, x2, y2);
  };
  const caixa = (x: number, y: number, w: number, h: number, esp = 0.22) => {
    doc.setDrawColor(75, 85, 85);
    doc.setLineWidth(esp);
    doc.rect(x, y, w, h);
  };
  const t = (s: string, x: number, y: number, o: { align?: "left" | "center" | "right" } = {}) => doc.text(limpar(s), x, y, o);

  const via = (x0: number, larg: number) => {
    const x1 = x0 + larg;
    // identificação da Prefeitura (logotipo em texto provisório)
    fonte(9, "normal", CINZA);
    t("Prefeitura de", x1, 11, { align: "right" });
    fonte(16, "bold", AZUL);
    t("Fortaleza", x1, 18, { align: "right" });
    fonte(5.6, "normal", CINZA);
    t("Secretaria Municipal da Saúde", x1, 21.5, { align: "right" });

    fonte(11.5, "bold");
    t("RECEITUÁRIO DE CONTROLE ESPECIAL", x0, 30);
    fonte(7.4, "bold");
    t("1ª VIA FARMÁCIA", x1, 27.5, { align: "right" });
    t("2ª VIA PACIENTE", x1, 31, { align: "right" });

    // identificação do emitente + carimbo
    caixa(x0, 35, 74, 29);
    fonte(5.8, "normal");
    t("IDENTIFICAÇÃO DO EMITENTE", x0 + 37, 38.5, { align: "center" });
    fonte(8.2, "bold");
    doc.text(["PROGRAMA MELHOR EM CASA", "Av. Washington Soares, 7700", "Messejana, CEP - 60844-150", "FORTALEZA - CEARÁ"].map(limpar), x0 + 37, 48.2, { align: "center", lineHeightFactor: 1.3 });
    fonte(8.6, "bold");
    t(CNPJ_PROGRAMA, x0 + 37, 43.2, { align: "center" });
    desenharCarimbo(doc, d.carimbo, x0 + 78 + (x1 - x0 - 78) / 2, 56, x1 - x0 - 80);
    linha(x0 + 78, 56, x1, 56);
    fonte(7.4);
    doc.text(["Carimbo e assinatura", "Médico / Cirurgião dentista"], x0 + 78 + (x1 - x0 - 78) / 2, 60, { align: "center", lineHeightFactor: 1.3 });

    // paciente, endereço e prescrição
    const campo = (rotulo: string, valor: string, y: number) => {
      fonte(8, "normal", CINZA);
      t(rotulo, x0, y);
      const xv = x0 + doc.getTextWidth(rotulo) + 1.5;
      fonte(9.5, "bold");
      const l = (doc.splitTextToSize(limpar(valor), x1 - xv) as string[])[0] ?? "";
      doc.text(l, xv + 0.8, y - 0.4);
      linha(xv, y + 1, x1, y + 1);
    };
    campo("Paciente:", d.nome, 74);
    campo("Endereço:", d.endereco, 82);
    fonte(8, "normal", CINZA);
    t("Prescrição:", x0, 90);
    const lh = 7.2;
    const texto = (doc.splitTextToSize(limpar(d.prescricao.replace(/\s*\n\s*/g, "\n")), larg - 2) as string[]).slice(0, LINHAS_PRESCRICAO);
    fonte(10);
    for (let i = 0; i < LINHAS_PRESCRICAO; i++) {
      const y = 90 + i * lh;
      linha(i === 0 ? x0 + 17 : x0, y + 1, x1, y + 1);
      if (i > 0 || texto.length) {
        const l = texto[i];
        if (l) t(l, i === 0 ? x0 + 18 : x0 + 1, y - 0.4);
      }
    }
    // a primeira linha da prescrição fica ao lado do rótulo; o restante usa a largura toda
    const yD = 90 + LINHAS_PRESCRICAO * lh + 3;
    fonte(8.6, "normal");
    t(`Data: ${dataPorExtenso(d.data)}`, x0, yD);

    // comprador e fornecedor
    const yB = 164, hB = 40, wC = 78;
    doc.setFillColor(233, 239, 238);
    doc.rect(x0, yB, larg, 5.5, "F");
    caixa(x0, yB, wC, hB);
    fonte(6.6, "normal");
    t("IDENTIFICAÇÃO DO COMPRADOR", x0 + wC / 2, yB + 4, { align: "center" });
    linha(x0, yB + 5.5, x0 + wC, yB + 5.5);
    const rotulos: [string, number][] = [["Nome:", 12.5], ["Ident.:", 12.5], ["End.:", 12.5], ["Cidade:", 12.5], ["Telefone:", 12.5]];
    fonte(7);
    let yy = yB + 11.5;
    for (const [r] of rotulos) {
      t(r, x0 + 1.5, yy);
      linha(x0 + 1.5 + doc.getTextWidth(r) + 1, yy + 0.8, x0 + wC - 1.5, yy + 0.8, 0.2);
      yy += 6.4;
    }
    t("Org. Emissor:", x0 + 41, yB + 17.9);
    t("UF:", x0 + 55, yB + 30.7);

    caixa(x0 + wC, yB, larg - wC, hB);
    fonte(6.6, "normal");
    t("IDENTIFICAÇÃO DO FORNECEDOR", x0 + wC + (larg - wC) / 2, yB + 4, { align: "center" });
    linha(x0 + wC, yB + 5.5, x1, yB + 5.5);
    linha(x0 + wC, yB + 31, x1, yB + 31);
    fonte(6.8);
    t("ASS DO FARMACÊUTICO", x0 + wC + 2, yB + 35.6);
    t("DATA:  ____/____/____", x1 - 2, yB + 38.4, { align: "right" });
  };

  via(8, 134);
  via(155, 134);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(148.5, 6, 148.5, 204);
  doc.setLineDashPattern([], 0);

  return { doc, nomeArquivo: `controle-especial-${slug(d.nome) || "paciente"}-${d.data}.pdf` };
}

export async function gerarControleEspecialPdf(d: DadosControleEspecial): Promise<void> {
  const { doc, nomeArquivo } = await montarControleEspecialPdf(d);
  doc.save(nomeArquivo);
}
