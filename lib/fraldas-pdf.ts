// Requerimento para fraldas descartáveis (Programa Melhor em Casa).
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import { desenharCarimbo } from "./carimbo";
import { dataPorExtenso } from "./receituario-pdf";
import { formatarData } from "./opcoes";

export type DadosFraldas = {
  // do cadastro
  nome: string;
  cns: string;
  nascimento: string;
  diagnostico: string;
  // preenchido pelo médico
  tipo: "geriatrica" | "infantil" | "";
  marcaDefinida: "sim" | "nao" | "";
  marcaMotivo: string;
  tamanho: string;
  porDia: string;
  data: string;
  carimbo?: string[];
};

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function montarFraldasPdf(d: DadosFraldas): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({
    title: `Requerimento de fraldas — ${d.nome}`,
    author: "EMAD 27",
    subject: "Requerimento para fraldas descartáveis",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const X0 = 22, X1 = 188, LARG = X1 - X0, MEIO = 105;
  const fonte = (tam: number, estilo: "normal" | "bold" = "normal", cor: [number, number, number] = [20, 20, 20]) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(cor[0], cor[1], cor[2]);
  };
  const traco = (x1: number, y: number, x2: number, esp = 0.22) => {
    doc.setDrawColor(75, 85, 85);
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
  doc.text("PROGRAMA MELHOR EM CASA", MEIO, 44, { align: "center" });
  fonte(11);
  doc.text(`Fortaleza, ${dataPorExtenso(d.data)}`, X1, 56, { align: "right" });

  const titulo = "REQUERIMENTO PARA FRALDAS DESCARTÁVEIS";
  fonte(11, "bold");
  doc.text(titulo, MEIO, 68, { align: "center" });
  const tw = doc.getTextWidth(titulo);
  traco(MEIO - tw / 2, 69.2, MEIO + tw / 2, 0.22);

  const campo = (rotulo: string, valor: string, x: number, y: number, xFim: number) => {
    fonte(10, "bold", [70, 85, 85]);
    doc.text(rotulo, x, y);
    const xv = x + doc.getTextWidth(rotulo) + 1.5;
    fonte(11);
    doc.text(limpar(valor), xv + 1, y - 0.4);
    traco(xv, y + 0.8, xFim, 0.18);
  };
  campo("Paciente:", d.nome, X0, 80, X1);
  campo("CNS:", d.cns, X0, 89, 100);
  campo("nascido(a) em:", d.nascimento ? formatarData(d.nascimento) : "", 106, 89, X1);
  fonte(11);
  doc.text("apresenta quadro de saúde compatível com diagnóstico de:", X0, 98);
  fonte(11);
  const diag = (doc.splitTextToSize(limpar(d.diagnostico || " "), LARG) as string[]).slice(0, 3);
  doc.text(diag, X0, 105.5, { lineHeightFactor: 1.55 });
  for (let i = 0; i < Math.max(diag.length, 2); i++) traco(X0, 106.8 + i * 7.6, X1, 0.18);

  fonte(11);
  const par = (texto: string, y: number) => {
    const linhas = doc.splitTextToSize(texto, LARG) as string[];
    doc.text(linhas, X0, y, { lineHeightFactor: 1.65 });
    return y + linhas.length * 11 * 0.3528 * 1.65 + 4;
  };
  let y = par(
    "Paciente restrito(a) ao leito, com dificuldade de controle dos esfíncteres, diurese e evacuações em fraldas, dependente de terceiros para sua higiene e atividades básicas de vida diária. Necessita, portanto, de FRALDAS DESCARTÁVEIS, em caráter de URGÊNCIA e POR TEMPO INDETERMINADO.",
    128,
  );
  y = par("O uso das fraldas é necessário para manutenção da higiene, diminuição do risco de infecções, de dermatites e de lesões por pressão, evitando, assim, futuras internações hospitalares.", y + 2);

  // necessidade média (parte preenchida pelo médico)
  y += 3;
  const caixinha = (x: number, yy: number, ativo: boolean) => {
    fonte(11);
    doc.text("(", x, yy);
    if (ativo) {
      fonte(11, "bold");
      doc.text("X", x + 2.1, yy);
    }
    fonte(11);
    doc.text(")", x + 5, yy);
    return x + 7;
  };
  fonte(11);
  doc.text("A necessidade média é de fraldas geriátricas", X0, y);
  let x = X0 + doc.getTextWidth("A necessidade média é de fraldas geriátricas") + 2;
  x = caixinha(x, y, d.tipo === "geriatrica");
  fonte(11);
  doc.text(", infantis", x - 1, y);
  x = caixinha(x + doc.getTextWidth(", infantis") + 1, y, d.tipo === "infantil");
  fonte(11);
  doc.text(".", x - 1.5, y);

  y += 9;
  fonte(11);
  doc.text("Marca definida:", X0, y);
  x = caixinha(X0 + doc.getTextWidth("Marca definida:") + 3, y, d.marcaDefinida === "sim");
  fonte(11);
  doc.text("sim", x + 1, y);
  x = caixinha(x + doc.getTextWidth("sim") + 6, y, d.marcaDefinida === "nao");
  fonte(11);
  doc.text("não", x + 1, y);
  y += 8;
  campo("Qual marca e qual motivo dessa marca específica?", d.marcaMotivo, X0, y, X1);
  y += 9;
  campo("Tamanho:", d.tamanho, X0, y, 90);
  y += 9;
  fonte(11);
  doc.text("Quantidade de", X0, y);
  const xq = X0 + doc.getTextWidth("Quantidade de") + 2;
  fonte(11);
  doc.text(d.porDia, xq + 8, y - 0.4, { align: "center" });
  traco(xq, y + 0.8, xq + 16, 0.18);
  doc.text("FRALDAS/DIA", xq + 19, y);
  const mes = Number(d.porDia) > 0 ? String(Math.round(Number(d.porDia) * 30)) : "";
  const xm = xq + 19 + doc.getTextWidth("FRALDAS/DIA") + 4;
  fonte(11);
  doc.text("(", xm, y);
  fonte(11);
  doc.text(mes, xm + 10, y - 0.4, { align: "center" });
  traco(xm + 3, y + 0.8, xm + 17, 0.18);
  doc.text("FRALDAS/MÊS).", xm + 19, y);

  // assinatura e rodapé
  desenharCarimbo(doc, d.carimbo, MEIO, 252, 90);
  traco(60, 252, 150, 0.22);
  fonte(11);
  doc.text("Médico do Programa Melhor em Casa – EMAD", MEIO, 258, { align: "center" });
  fonte(8);
  doc.text(["Hospital Distrital Gonzaga Mota de Messejana (Anexo Centro de Estudos)", "Av. Washington Soares, 7700 - Messejana, Fortaleza - CE, 60844-150"], X0, 281, { lineHeightFactor: 1.4 });

  return { doc, nomeArquivo: `fraldas-${slug(d.nome) || "paciente"}-${d.data}.pdf` };
}

export async function gerarFraldasPdf(d: DadosFraldas): Promise<void> {
  const { doc, nomeArquivo } = await montarFraldasPdf(d);
  doc.save(nomeArquivo);
}
