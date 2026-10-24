// Solicitação de exames (EMAD) do Programa Melhor em Casa: folha A4 com duas vias lado a lado.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import { formatarData } from "./opcoes";

/** Exames impressos no modelo, na ordem das colunas (15 por coluna; a terceira tem só 3 e o resto é "outros"). */
export const EXAMES_COLUNAS: string[][] = [
  ["Hemograma", "Ureia", "Creatinina", "Sódio", "Potássio", "Fósforo", "Cálcio", "Magnésio", "TGO", "TGP", "GGT", "FA", "Colesterol total", "LDL", "HDL"],
  ["Triglicerídeos", "Amilase", "Lipase", "HBA1C", "Ferro sérico", "Ferritina", "Índice de saturação da transferrina", "Vitamina B12", "Ácido fólico", "Vitamina D", "TAP", "TTPA", "Glicemia de jejum", "Sumário de urina", "Urocultura"],
  ["Hemocultura", "TSH", "T4 Livre"],
];
export const LINHAS_TABELA = 15;
export const MAX_OUTROS = LINHAS_TABELA - EXAMES_COLUNAS[2].length;

export type DadosExames = {
  nome: string;
  nascimento: string;
  cns: string;
  mae: string;
  endereco: string;
  /** Exames marcados (nomes exatamente como em EXAMES_COLUNAS). */
  marcados: string[];
  /** Exames que não estão no modelo, um por linha. */
  outros: string[];
  /** Data da coleta (yyyy-mm-dd) ou vazio para preencher à mão. */
  dataColeta: string;
  /** Data da emissão (só para o nome do arquivo). */
  hoje: string;
};

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function montarExamesPdf(d: DadosExames): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape", compress: true });
  doc.setProperties({
    title: `Solicitação de exames — ${d.nome}`,
    author: "EMAD 27",
    subject: "Solicitação de exames",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const fonte = (tam: number, estilo: "normal" | "bold" = "normal", cor: [number, number, number] = [20, 20, 20]) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(cor[0], cor[1], cor[2]);
  };
  const linha = (x1: number, y1: number, x2: number, y2: number, esp = 0.25) => {
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(esp);
    doc.line(x1, y1, x2, y2);
  };

  const via = (x0: number, larg: number) => {
    const x1 = x0 + larg;
    fonte(6.6, "bold");
    doc.text(["PREFEITURA MUNICIPAL DE FORTALEZA", "SECRETARIA MUNICIPAL DE SAÚDE", "EQUIPE MULTIPROFISSIONAL DE ATENDIMENTO DOMICILIAR - EMAD"].map(limpar), x0, 11, { lineHeightFactor: 1.4 });
    fonte(9, "bold", [18, 70, 140]);
    doc.text("Melhor em Casa", x1 - 22, 14, { align: "right" });
    fonte(10, "bold", [60, 60, 60]);
    doc.text("Fortaleza", x1, 14, { align: "right" });

    // identificação do paciente
    const campo = (rotulo: string, valor: string, x: number, y: number, xFim: number, tam = 9) => {
      fonte(8.2, "bold");
      doc.text(rotulo, x, y);
      const xv = x + doc.getTextWidth(rotulo) + 1;
      fonte(tam, "bold");
      doc.text(limpar(valor), xv + 0.8, y - 0.4);
      linha(xv, y + 0.9, xFim, y + 0.9);
    };
    campo("PACIENTE:", d.nome, x0, 28, x1);
    campo("DATA DE NASC.:", d.nascimento ? formatarData(d.nascimento) : "", x0, 35, x0 + 62);
    campo("CNS:", d.cns, x0 + 68, 35, x1);
    campo("NOME DA MÃE:", d.mae, x0, 42, x1);
    fonte(8.2, "bold");
    doc.text("ENDEREÇO:", x0, 49);
    const xe = x0 + doc.getTextWidth("ENDEREÇO:") + 1.8;
    fonte(8.4, "bold");
    const end = (doc.splitTextToSize(limpar(d.endereco || " "), x1 - xe) as string[]).slice(0, 2);
    doc.text(end, xe, 48.6, { lineHeightFactor: 1.2 });
    linha(xe - 0.8, 49.9, x1, 49.9);
    if (end.length > 1) linha(x0, 54.2, x1, 54.2);

    fonte(10, "bold");
    doc.text("SOLICITAÇÃO DE EXAMES", x0 + larg / 2, 62, { align: "center" });

    // tabela: 3 grupos de (exame | marcação)
    const yT = 66, hL = 6.3;
    const wMarca = 7, wNome = (larg - 3 * wMarca) / 3;
    const marcados = new Set(d.marcados);
    for (let g = 0; g < 3; g++) {
      const xg = x0 + g * (wNome + wMarca);
      for (let r = 0; r < LINHAS_TABELA; r++) {
        const y = yT + r * hL;
        doc.setDrawColor(20, 20, 20);
        doc.setLineWidth(0.25);
        doc.rect(xg, y, wNome, hL);
        doc.rect(xg + wNome, y, wMarca, hL);
        const nome = g < 2 || r < EXAMES_COLUNAS[2].length ? EXAMES_COLUNAS[g][r] : undefined;
        const outro = g === 2 && r >= EXAMES_COLUNAS[2].length ? d.outros[r - EXAMES_COLUNAS[2].length] : undefined;
        const texto = nome ?? outro;
        if (texto) {
          fonte(nome ? 7.6 : 7.4, nome ? "normal" : "bold");
          const t = (doc.splitTextToSize(limpar(texto), wNome - 2) as string[]).slice(0, 2);
          doc.text(t, xg + 1, y + (t.length > 1 ? 2.8 : 4.1), { lineHeightFactor: 1.05 });
        }
        if (nome && marcados.has(nome)) {
          fonte(9, "bold");
          doc.text("X", xg + wNome + wMarca / 2, y + 4.5, { align: "center" });
        }
      }
    }

    // data da coleta e médico
    const yb = yT + LINHAS_TABELA * hL + 11;
    fonte(8.6, "bold");
    doc.text("Data da coleta:", x0, yb);
    const xd = x0 + doc.getTextWidth("Data da coleta:") + 2;
    if (d.dataColeta) {
      doc.text(formatarData(d.dataColeta), xd + 1, yb - 0.4);
      linha(xd, yb + 0.9, xd + 30, yb + 0.9);
    } else {
      doc.setFont("helvetica", "normal");
      doc.text("____/____/____", xd, yb);
    }
    doc.setFont("helvetica", "bold");
    doc.text("Médico(a) /CRM:", x0, yb + 11);
    linha(x0 + doc.getTextWidth("Médico(a) /CRM:") + 2, yb + 11.9, x1, yb + 11.9);
  };

  via(8, 134);
  via(155, 134);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(148.5, 6, 148.5, 204);
  doc.setLineDashPattern([], 0);

  return { doc, nomeArquivo: `exames-${slug(d.nome) || "paciente"}-${d.hoje}.pdf` };
}

export async function gerarExamesPdf(d: DadosExames): Promise<void> {
  const { doc, nomeArquivo } = await montarExamesPdf(d);
  doc.save(nomeArquivo);
}
