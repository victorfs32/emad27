// Requerimento para solicitação de dieta enteral (Programa Melhor em Casa), todo preenchido pelo cadastro.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import { desenharCarimbo } from "./carimbo";
import { dataPorExtenso } from "./receituario-pdf";
import { formatarData } from "./opcoes";

export type DadosDietaEnteral = {
  nome: string;
  /** yyyy-mm-dd ou vazio */
  nascimento: string;
  cns: string;
  diagnostico: string;
  /** Via de alimentação (ex.: "gastrostomia") ou vazio */
  via: string;
  /** Data do requerimento (yyyy-mm-dd) */
  data: string;
  carimbo?: string[];
};

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function montarDietaEnteralPdf(d: DadosDietaEnteral): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({
    title: `Requerimento de dieta enteral — ${d.nome}`,
    author: "EMAD 27",
    subject: "Requerimento para solicitação de dieta enteral",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const X0 = 22, X1 = 188, LARG = X1 - X0, MEIO = 105;
  const fonte = (tam: number, estilo: "normal" | "bold" = "normal", cor: [number, number, number] = [20, 20, 20]) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(cor[0], cor[1], cor[2]);
  };
  const traco = (x1: number, y: number, x2: number, esp = 0.3) => {
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(esp);
    doc.line(x1, y, x2, y);
  };

  // cabeçalho (logotipo em texto provisório)
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(1.2);
  doc.line(10, 18, 78, 18);
  doc.line(132, 18, 200, 18);
  fonte(17, "bold", [60, 60, 60]);
  doc.text("FORTALEZA", MEIO, 20, { align: "center" });
  fonte(6.4, "normal", [110, 110, 110]);
  doc.text("PREFEITURA", MEIO, 24, { align: "center", charSpace: 1.8 });
  doc.text("SAÚDE", MEIO, 27.5, { align: "center" });

  fonte(10.5, "bold");
  doc.text("PROGRAMA MELHOR EM CASA", MEIO, 46, { align: "center" });
  const titulo = "REQUERIMENTO PARA SOLICITAÇÃO DE DIETA ENTERAL";
  fonte(11, "bold");
  doc.text(titulo, MEIO, 56, { align: "center" });
  const tw = doc.getTextWidth(titulo);
  traco(MEIO - tw / 2, 57.2, MEIO + tw / 2, 0.4);

  fonte(11);
  doc.text(`Fortaleza, ${dataPorExtenso(d.data)}`, X1, 70, { align: "right" });

  // dados do paciente
  const campo = (rotulo: string, valor: string, x: number, y: number, xFim: number) => {
    fonte(11);
    doc.text(rotulo, x, y);
    const xv = x + doc.getTextWidth(rotulo) + 1.5;
    fonte(11, "bold");
    doc.text(limpar(valor), xv + 1, y - 0.4);
    traco(xv, y + 0.8, xFim, 0.25);
  };
  campo("Paciente:", d.nome, X0, 82, X1);
  campo("data de nascimento:", d.nascimento ? formatarData(d.nascimento) : "", X0, 91, 105);
  campo("CNS:", d.cns, 110, 91, X1);

  fonte(11);
  doc.text("admitido no Programa Melhor em Casa com diagnóstico de:", X0, 100);
  fonte(11, "bold");
  const diag = (doc.splitTextToSize(limpar(d.diagnostico || " "), LARG) as string[]).slice(0, 3);
  doc.text(diag, X0, 107.5, { lineHeightFactor: 1.55 });
  for (let i = 0; i < Math.max(diag.length, 2); i++) traco(X0, 108.8 + i * 7.6, X1, 0.25);

  // texto do requerimento
  const y0 = 130;
  const via = d.via ? limpar(d.via) : "__________________";
  fonte(11);
  const par = (texto: string, y: number) => {
    const linhas = doc.splitTextToSize(texto, LARG) as string[];
    doc.text(linhas, X0, y, { lineHeightFactor: 1.65 });
    return y + linhas.length * 11 * 0.3528 * 1.65 + 4;
  };
  let y = par(
    `Encontra-se restrito (a) ao leito, estando impossibilitado(a) de realizar atividades de vida diária, necessitando de ajuda de terceiros para sua higiene, alimentação e outros cuidados. Alimenta-se exclusivamente via ${via}, com dieta especial de uso contínuo, e necessita, em caráter de URGÊNCIA, do fornecimento de dieta enteral, bem como de insumos necessários para a alimentação, conforme orientação da nutricionista fornecidos em laudo específico, para manter suas necessidades calóricas, proteicas e dos demais nutrientes, em ambiente domiciliar.`,
    y0,
  );
  y = par(
    "É imprescindível informar que a alimentação NÃO pode ser substituída por dieta artesanal e/ou semiartesanal devido aos riscos caso haja substituição (risco de desnutrição, contaminação, obstrução da sonda, agravamento do quadro clínico e risco de óbito).",
    y + 2,
  );
  y = par("Caso não a receba, terá prejuízos à sua saúde como internação por desnutrição e alterações glicêmicas potencialmente graves.", y + 2);
  fonte(11);
  doc.text("Atenciosamente,", X0, y + 6);

  // assinatura e rodapé
  desenharCarimbo(doc, d.carimbo, MEIO, 262, 90);
  traco(60, 262, 150, 0.3);
  fonte(11);
  doc.text("Médico do Programa Melhor em Casa", MEIO, 268, { align: "center" });
  fonte(8);
  doc.text(["Hospital Distrital Gonzaga Mota de Messejana (Anexo Centro de Estudos)", "Av. Washington Soares, 7700 - Messejana, Fortaleza - CE, 60844-150"], X0, 281, { lineHeightFactor: 1.4 });

  return { doc, nomeArquivo: `dieta-enteral-${slug(d.nome) || "paciente"}-${d.data}.pdf` };
}

export async function gerarDietaEnteralPdf(d: DadosDietaEnteral): Promise<void> {
  const { doc, nomeArquivo } = await montarDietaEnteralPdf(d);
  doc.save(nomeArquivo);
}
