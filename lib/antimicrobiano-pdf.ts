// Ficha de Antimicrobiano (GER.FOR.CE-0008) do Programa Melhor em Casa.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import { desenharCarimbo } from "./carimbo";
import { desenharLogo } from "./logo";
import { formatarData } from "./opcoes";

export const FOCOS_INFECCAO = ["TGI", "IVAS", "Pulmonar", "TGU", "Corrente sanguínea", "Tegumentar"] as const;
export const ORIGENS = ["Hospitalar", "Comunitária", "Indefinido"] as const;
export const TIPOS_TRATAMENTO = ["Início", "Prolongamento", "Escalonamento"] as const;
export const LINHAS_ANTIBIOTICO = 4;

export type ItemAntibiotico = { nome: string; dose: string; via: string; duracao: string };

export type DadosAntimicrobiano = {
  // do cadastro
  nome: string;
  idade: string;
  nascimento: string;
  sexo: string;
  cns: string;
  // preenchido pelo médico
  focos: string[];
  focoOutra: string;
  origem: string;
  guiadaCultura: "sim" | "nao" | "";
  dataColeta: string;
  microorganismo: string;
  antibioticos: ItemAntibiotico[];
  dataInicio: string;
  tipo: string;
  justificativa: string;
  data: string;
  carimbo?: string[];
};

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type Cor = [number, number, number];
const PRETO: Cor = [20, 20, 20];
const CINZA: Cor = [110, 110, 110];
const AZUL: Cor = [18, 70, 140];
const VERDE: Cor = [0, 150, 70];

export async function montarAntimicrobianoPdf(d: DadosAntimicrobiano): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({
    title: `Ficha de antimicrobiano — ${d.nome}`,
    author: "EMAD 27",
    subject: "Ficha de antimicrobiano",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const X0 = 10, X1 = 200, LARG = X1 - X0;
  const fonte = (tam: number, estilo: "normal" | "bold" = "normal", cor: Cor = PRETO) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(cor[0], cor[1], cor[2]);
  };
  const linha = (x1: number, y1: number, x2: number, y2: number, esp = 0.22) => {
    doc.setDrawColor(75, 85, 85);
    doc.setLineWidth(esp);
    doc.line(x1, y1, x2, y2);
  };
  const caixa = (x: number, y: number, w: number, h: number, esp = 0.22) => {
    doc.setDrawColor(75, 85, 85);
    doc.setLineWidth(esp);
    doc.rect(x, y, w, h);
  };
  const texto = (t: string, x: number, y: number, opcoes: { align?: "left" | "center" | "right" } = {}) => doc.text(limpar(t), x, y, opcoes);
  /** "( )" ou "(X)" seguido do rótulo; devolve a largura ocupada. */
  const marca = (x: number, y: number, ativo: boolean, rotulo: string) => {
    fonte(9.5);
    texto("(", x, y);
    if (ativo) {
      fonte(9.5, "bold");
      texto("X", x + 1.85, y);
    }
    fonte(9.5);
    texto(")", x + 4.6, y);
    texto(rotulo, x + 7, y);
    return 7 + doc.getTextWidth(limpar(rotulo));
  };
  /** Valor escrito sobre uma linha (campo em branco com valor opcional). */
  const campo = (valor: string, x: number, y: number, xFim: number) => {
    linha(x, y + 1, xFim, y + 1, 0.18);
    if (valor) {
      fonte(9.5);
      texto(valor, x + 1, y - 0.3);
    }
  };
  const dataCampo = (iso: string) => (iso ? formatarData(iso) : "");

  // ------------------------------------------------------------ cabeçalho
  fonte(15, "bold", AZUL);
  texto("SPDM", 36, 20, { align: "center" });
  fonte(6.4, "bold", CINZA);
  texto("PAIS", 36, 24, { align: "center" });
  fonte(13, "bold", AZUL);
  texto("SUS", 82, 21, { align: "center" });
  doc.setFillColor(VERDE[0], VERDE[1], VERDE[2]);
  doc.rect(93.7, 14, 2.2, 8, "F");
  doc.rect(90.8, 16.9, 8, 2.2, "F");
  desenharLogo(doc, 139, 9.5, 32);

  caixa(X0, 28, 130, 14);
  caixa(X0 + 130, 28, LARG - 130, 14);
  linha(X0, 35, X0 + 130, 35);
  fonte(8, "bold");
  texto("Formulário", X0 + 65, 32.4, { align: "center" });
  texto("Ficha de Antimicrobiano", X0 + 65, 39.6, { align: "center" });
  fonte(8, "bold");
  texto("Código: GER.FOR.CE-0008", X0 + 132, 32);
  texto("Revisão: 00", X0 + 132, 36);
  texto("Página 1 de 1", X0 + 132, 40.2);

  // ------------------------------------------------------------ identificação
  caixa(X0, 46, LARG, 22);
  doc.setFillColor(233, 239, 238);
  doc.rect(X0, 46, X1 - X0, 5.5, "F");
  linha(X0, 51.5, X1, 51.5);
  fonte(8.6, "bold");
  texto("IDENTIFICAÇÃO DO PACIENTE", (X0 + X1) / 2, 50.2, { align: "center" });
  fonte(8.6);
  fonte(7.4, "bold", [70, 85, 85]);
  texto("NOME:", X0 + 2, 57);
  campo(d.nome, X0 + 14, 57, 140);
  fonte(7.4, "bold", [70, 85, 85]);
  texto("IDADE:", 144, 57);
  campo(d.idade, 156, 57, X1 - 2);
  fonte(7.4, "bold", [70, 85, 85]);
  texto("DATA DE NASCIMENTO:", X0 + 2, 63);
  campo(dataCampo(d.nascimento), X0 + 41, 63, 100);
  fonte(7.4, "bold", [70, 85, 85]);
  texto("SEXO:", 104, 63);
  marca(115, 63, d.sexo === "M", "Masculino");
  marca(152, 63, d.sexo === "F", "Feminino");
  fonte(7.4, "bold", [70, 85, 85]);
  texto("CNS:", X0 + 2, 67.3);
  campo(d.cns, X0 + 11, 67.3, X1 - 2);

  // ------------------------------------------------------------ 1. foco
  fonte(9.8, "bold");
  texto("1. Foco provável da infecção:", X0 + 2, 78);
  const focoAtivo = (f: string) => d.focos.includes(f);
  marca(X0 + 2, 84, focoAtivo("TGI"), "TGI");
  marca(X0 + 2, 90, focoAtivo("IVAS"), "IVAS");
  marca(X0 + 2, 96, focoAtivo("Pulmonar"), "Pulmonar");
  marca(72, 84, focoAtivo("TGU"), "TGU");
  marca(72, 90, focoAtivo("Corrente sanguínea"), "Corrente sanguínea");
  marca(72, 96, focoAtivo("Tegumentar"), "TEGUMENTAR");
  marca(136, 84, !!d.focoOutra || focoAtivo("Outra"), "Outra:");
  campo(d.focoOutra, 136, 91, X1 - 2);

  // ------------------------------------------------------------ 2. origem e 3. cultura
  fonte(9.8, "bold");
  texto("2. Origem:", X0 + 2, 106);
  marca(33, 106, d.origem === "Hospitalar", "Hospitalar");
  marca(68, 106, d.origem === "Comunitária", "Comunitária");
  marca(106, 106, d.origem === "Indefinido", "Indefinido");
  fonte(9.8, "bold");
  texto("3. Prescrição guiada por cultura?", X0 + 2, 112);
  marca(75, 112, d.guiadaCultura === "sim", "Sim");
  marca(95, 112, d.guiadaCultura === "nao", "Não");
  fonte(9.5, "bold");
  texto("Se SIM, responda:", X0 + 2, 118);
  fonte(9.5);
  texto("Data da coleta:", X0 + 2, 124);
  campo(dataCampo(d.dataColeta), 38, 124, 72);
  texto("Nome do microorganismo:", 78, 124);
  campo(d.microorganismo, 123, 124, X1 - 2);

  // ------------------------------------------------------------ 4. prescrição
  fonte(9.8, "bold");
  texto("4. Prescrição:", X0 + 2, 134);
  const colunas = [58, 42, 48, 42];
  const titulos = ["Nome do antibiótico", "Dose/Posologia", "Via de Administração", "Duração do tratamento"];
  const yT = 137, hCab = 10, hLin = 11;
  let xc = X0;
  colunas.forEach((w, i) => {
    doc.setFillColor(215, 215, 215);
    doc.rect(xc, yT, w, hCab, "FD");
    caixa(xc, yT, w, hCab);
    fonte(9, "bold");
    const t = doc.splitTextToSize(limpar(titulos[i]), w - 3) as string[];
    doc.text(t, xc + w / 2, yT + (t.length > 1 ? 4.2 : 6.2), { align: "center", lineHeightFactor: 1.15 });
    xc += w;
  });
  for (let r = 0; r < LINHAS_ANTIBIOTICO; r++) {
    const a = d.antibioticos[r];
    const valores = a ? [a.nome, a.dose, a.via, a.duracao] : ["", "", "", ""];
    xc = X0;
    colunas.forEach((w, i) => {
      caixa(xc, yT + hCab + r * hLin, w, hLin);
      if (valores[i]) {
        fonte(9);
        const t = (doc.splitTextToSize(limpar(valores[i]), w - 3) as string[]).slice(0, 3);
        doc.text(t, xc + 1.6, yT + hCab + r * hLin + (t.length > 1 ? 4 : 6.6), { lineHeightFactor: 1.15 });
      }
      xc += w;
    });
  }

  // ------------------------------------------------------------ 5. início e 6. justificativa
  const yFim = yT + hCab + LINHAS_ANTIBIOTICO * hLin;
  fonte(9.8, "bold");
  texto("5. Data do início do tratamento:", X0 + 2, yFim + 9);
  campo(dataCampo(d.dataInicio), 78, yFim + 9, 112);
  marca(X0 + 2, yFim + 15, d.tipo === "Início", "Início");
  marca(36, yFim + 15, d.tipo === "Prolongamento", "Prolongamento");
  marca(80, yFim + 15, d.tipo === "Escalonamento", "Escalonamento");

  fonte(9.8, "bold");
  texto("6. Justificativa:", X0 + 2, yFim + 23);
  const yJ = yFim + 29;
  const just = (doc.splitTextToSize(limpar(d.justificativa), LARG - 6) as string[]).slice(0, 4);
  fonte(9.5);
  doc.text(just, X0 + 2, yJ - 0.8, { lineHeightFactor: 1.9 });
  for (let i = 0; i < 3; i++) linha(X0 + 2, yJ + i * 6.6 + 1, X1 - 2, yJ + i * 6.6 + 1, 0.18);

  // ------------------------------------------------------------ data, assinatura e rodapé
  fonte(9.8, "bold");
  texto("Data:", X0 + 2, 244);
  campo(dataCampo(d.data), 24, 244, 62);
  desenharCarimbo(doc, d.carimbo, 115, 262, 90);
  linha(70, 262, 160, 262);
  fonte(9);
  texto("Assinatura e carimbo do Médico(a)", 115, 267, { align: "center" });

  fonte(7.4, "bold", CINZA);
  texto("PROGRAMA MELHOR EM CASA", X0 + 8, 283);
  fonte(7.4, "normal", CINZA);
  texto("Avenida Washington Soares, 7700, Messejana - 60875-672 | Fortaleza - CE | Tel: (85) 33716691", X0 + 8, 287);

  return { doc, nomeArquivo: `ficha-antimicrobiano-${slug(d.nome) || "paciente"}-${d.data}.pdf` };
}

export async function gerarAntimicrobianoPdf(d: DadosAntimicrobiano): Promise<void> {
  const { doc, nomeArquivo } = await montarAntimicrobianoPdf(d);
  doc.save(nomeArquivo);
}
