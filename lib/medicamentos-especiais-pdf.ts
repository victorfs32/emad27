// Laudo de solicitação de medicamento(s) do Componente Especializado da Assistência Farmacêutica.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import { desenharCarimbo } from "./carimbo";
import { formatarData } from "./opcoes";

export const LINHAS_MEDICAMENTOS = 6;
export const MESES_QUANTIDADE = 6;
export const PREENCHIDO_POR = ["Paciente", "Mãe do paciente", "Responsável", "Médico solicitante", "Outro"] as const;
export const RACAS = ["Branca", "Amarela", "Preta", "Indígena", "Parda", "Sem informação"] as const;

export type MedicamentoSolicitado = { nome: string; quantidades: string[] };

export type DadosMedicamentosEspeciais = {
  // do cadastro
  nome: string;
  mae: string;
  cid: string;
  diagnostico: string;
  telefone: string;
  cpf: string;
  cns: string;
  // preenchido pelo médico
  cnes: string;
  estabelecimento: string;
  peso: string;
  altura: string;
  medicamentos: MedicamentoSolicitado[];
  anamnese: string;
  tratamentoPrevio: "sim" | "nao" | "";
  relato: string;
  incapaz: "sim" | "nao" | "";
  responsavel: string;
  medico: string;
  cnsMedico: string;
  data: string;
  preenchidoPor: string;
  outroNome: string;
  outroCpf: string;
  raca: string;
  etnia: string;
  documento: "cpf" | "cns" | "";
  email: string;
  carimbo?: string[];
};

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const soAlfanum = (t: string) => t.replace(/[^0-9A-Za-z]/g, "").toUpperCase();

type Cor = [number, number, number];
const PRETO: Cor = [20, 20, 20];
const CINZA: Cor = [110, 110, 110];

export async function montarMedicamentosEspeciaisPdf(d: DadosMedicamentosEspeciais): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({
    title: `Solicitação de medicamentos especiais — ${d.nome}`,
    author: "EMAD 27",
    subject: "Laudo de solicitação de medicamento(s) — CEAF",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const X0 = 8, X1 = 202;
  const fonte = (tam: number, estilo: "normal" | "bold" = "normal", cor: Cor = PRETO) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(cor[0], cor[1], cor[2]);
  };
  const traco = (esp = 0.22) => {
    doc.setDrawColor(75, 85, 85);
    doc.setLineWidth(esp);
  };
  const caixa = (x: number, y: number, w: number, h: number, r = 0, esp = 0.22) => {
    traco(esp);
    if (r) doc.roundedRect(x, y, w, h, r, r);
    else doc.rect(x, y, w, h);
  };
  const t = (s: string, x: number, y: number, o: { align?: "left" | "center" | "right" } = {}) => doc.text(limpar(s), x, y, o);
  const rotulo = (s: string, x: number, y: number) => {
    fonte(6.8, "bold", [70, 85, 85]);
    t(s, x, y);
    return doc.getTextWidth(limpar(s));
  };
  /** Uma letra por casinha (campos de código). */
  const celulas = (valor: string, n: number, x: number, y: number, w: number, h: number) => {
    const v = soAlfanum(valor).slice(0, n);
    traco(0.18);
    for (let i = 0; i < n; i++) {
      doc.rect(x + i * w, y, w, h);
      if (v[i]) {
        fonte(9, "bold");
        t(v[i], x + i * w + w / 2, y + h - 1.7, { align: "center" });
      }
    }
  };
  const marca = (x: number, y: number, ativo: boolean, texto: string, tam = 7.6) => {
    traco(0.22);
    doc.rect(x, y - 2.7, 3, 3);
    if (ativo) {
      fonte(8, "bold");
      t("X", x + 1.5, y - 0.2, { align: "center" });
    }
    fonte(tam, "normal");
    t(texto, x + 4.2, y);
    return 4.2 + doc.getTextWidth(limpar(texto));
  };
  const valor = (s: string, x: number, y: number, larg: number, tam = 9) => {
    fonte(tam);
    const l = (doc.splitTextToSize(limpar(s), larg) as string[])[0] ?? "";
    t(l, x, y);
  };

  // ------------------------------------------------------------ cabeçalho
  caixa(X0, 8, X1 - X0, 31);
  fonte(19, "bold");
  t("SUS", 24, 20);
  doc.setFillColor(20, 20, 20);
  doc.rect(51.5, 11, 3, 10, "F");
  doc.rect(48, 14.5, 10, 3, "F");
  fonte(6.6, "bold", CINZA);
  doc.text(["Sistema Único de Saúde", "Ministério da Saúde", "Secretaria de Estado da Saúde"].map(limpar), 110, 12.5, { lineHeightFactor: 1.5 });
  doc.setFillColor(20, 20, 20);
  doc.rect(X0, 22, X1 - X0, 5.5, "F");
  fonte(8.4, "bold", [255, 255, 255]);
  t("COMPONENTE ESPECIALIZADO DA ASSISTÊNCIA FARMACÊUTICA", (X0 + X1) / 2, 26, { align: "center" });
  doc.setFillColor(150, 150, 150);
  doc.rect(X0, 27.5, X1 - X0, 5.5, "F");
  fonte(8.4, "bold", [60, 60, 60]);
  t("LAUDO DE SOLICITAÇÃO, AVALIAÇÃO E AUTORIZAÇÃO DE MEDICAMENTO(S)", (X0 + X1) / 2, 31.6, { align: "center" });
  fonte(9.4, "bold");
  t("SOLICITAÇÃO DE MEDICAMENTO(S)", (X0 + X1) / 2, 37.4, { align: "center" });
  caixa(X0, 40.5, X1 - X0, 7, 2);
  fonte(7.6, "bold");
  t("CAMPOS DE PREENCHIMENTO EXCLUSIVO PELO MÉDICO SOLICITANTE", (X0 + X1) / 2, 45.2, { align: "center" });

  // ------------------------------------------------------------ 1 e 2
  caixa(X0, 50, X1 - X0, 9, 2);
  const w1 = rotulo("1-Número do CNES*", X0 + 2, 55.5);
  celulas(d.cnes, 7, X0 + w1 + 4, 51.6, 5, 6);
  rotulo("2- Nome do estabelecimento de saúde solicitante", 88, 54.5);
  valor(d.estabelecimento, 88, 57.7, X1 - 90, 8);

  // ------------------------------------------------------------ 3 a 6
  caixa(X0, 61, 143, 9, 2);
  rotulo("3- Nome completo do Paciente*", X0 + 2, 64.4);
  valor(d.nome, X0 + 2, 68.6, 138);
  caixa(X0, 71.5, 143, 9, 2);
  rotulo("4- Nome da Mãe do Paciente*", X0 + 2, 74.9);
  valor(d.mae, X0 + 2, 79.1, 138);
  rotulo("5-Peso do paciente*", 156, 63);
  celulas(d.peso, 3, 153, 64.2, 6, 6);
  rotulo("kg", 172, 69);
  rotulo("6-Altura do paciente*", 156, 73.5);
  celulas(d.altura, 3, 153, 74.7, 6, 6);
  rotulo("cm", 172, 79.5);

  // ------------------------------------------------------------ 7 e 8: medicamentos
  const yT = 83, hCab = 10, hLin = 7.6;
  const xMed = 8 + 7, xQ = 118, wMes = (X1 - xQ) / MESES_QUANTIDADE;
  caixa(X0, yT, xQ - X0, hCab);
  caixa(xQ, yT, X1 - xQ, 5.4);
  fonte(8.4, "bold");
  t("7- Medicamento(s)*", (xMed + xQ) / 2, yT + 6.4, { align: "center" });
  t("8- Quantidade solicitada*", (xQ + X1) / 2, yT + 4, { align: "center" });
  for (let m = 0; m < MESES_QUANTIDADE; m++) {
    caixa(xQ + m * wMes, yT + 5.4, wMes, hCab - 5.4);
    fonte(6.4, "bold");
    t(`${m + 1}º mês`, xQ + m * wMes + wMes / 2, yT + 8.9, { align: "center" });
  }
  for (let r = 0; r < LINHAS_MEDICAMENTOS; r++) {
    const y = yT + hCab + r * hLin;
    const it = d.medicamentos[r];
    caixa(X0, y, 7, hLin);
    caixa(xMed, y, xQ - xMed, hLin);
    fonte(7.6, "bold");
    t(String(r + 1), X0 + 3.5, y + 5, { align: "center" });
    if (it?.nome) {
      fonte(8.6, "bold");
      const l = (doc.splitTextToSize(limpar(it.nome), xQ - xMed - 3) as string[]).slice(0, 2);
      doc.text(l, xMed + 1.5, y + (l.length > 1 ? 3.2 : 4.9), { lineHeightFactor: 1.05 });
    }
    for (let m = 0; m < MESES_QUANTIDADE; m++) {
      caixa(xQ + m * wMes, y, wMes, hLin);
      const q = it?.quantidades[m];
      if (q) {
        fonte(8.4, "bold");
        t(q, xQ + m * wMes + wMes / 2, y + 5, { align: "center" });
      }
    }
  }
  const yAposTabela = yT + hCab + LINHAS_MEDICAMENTOS * hLin;

  // ------------------------------------------------------------ 9 e 10
  let y = yAposTabela + 3;
  caixa(X0, y, 42, 9, 2);
  const w9 = rotulo("9- CID-10*", X0 + 2, y + 5.6);
  celulas(d.cid, 4, X0 + w9 + 5, y + 1.6, 5.5, 6);
  caixa(X0 + 44, y, X1 - X0 - 44, 9, 2);
  rotulo("10- Diagnóstico", X0 + 46, y + 3.4);
  valor(d.diagnostico, X0 + 46, y + 7.6, X1 - X0 - 50, 8);

  // ------------------------------------------------------------ 11 anamnese
  y += 11.5;
  caixa(X0, y, X1 - X0, 22, 2);
  rotulo("11- Anamnese*", X0 + 2, y + 4);
  fonte(8.6, "normal");
  const an = (doc.splitTextToSize(limpar(d.anamnese), X1 - X0 - 6) as string[]).slice(0, 5);
  doc.text(an, X0 + 3, y + 9, { lineHeightFactor: 1.4 });

  // ------------------------------------------------------------ 12 tratamento prévio
  y += 24;
  caixa(X0, y, X1 - X0, 11, 2);
  rotulo("12- Paciente realizou tratamento prévio ou está em tratamento da doença?*", X0 + 2, y + 4);
  const wn = marca(X0 + 4, y + 9, d.tratamentoPrevio === "nao", "NÃO");
  const xs = X0 + 4 + wn + 8;
  const ws = marca(xs, y + 9, d.tratamentoPrevio === "sim", "SIM. Relatar:");
  if (d.tratamentoPrevio === "sim") valor(d.relato, xs + ws + 2, y + 9, X1 - xs - ws - 6, 8);

  // ------------------------------------------------------------ 13 atestado de capacidade
  y += 13;
  caixa(X0, y, X1 - X0, 25, 2);
  fonte(9, "bold");
  t("13- Atestado de capacidade*", (X0 + X1) / 2, y + 5, { align: "center" });
  fonte(6.8, "normal");
  doc.text(
    doc.splitTextToSize(limpar("A solicitação do medicamento deverá ser realizada pelo paciente. Entretanto, fica dispensada a obrigatoriedade da presença física do paciente considerado incapaz de acordo com os artigos 3º e 4º do Código Civil. O paciente é considerado incapaz?"), X1 - X0 - 8) as string[],
    X0 + 4, y + 9, { lineHeightFactor: 1.35 },
  );
  marca(X0 + 4, y + 18, d.incapaz === "nao", "NÃO", 8);
  const xi = X0 + 28;
  const wi = marca(xi, y + 18, d.incapaz === "sim", "SIM. Indicar o nome do responsável pelo paciente, o qual", 7.6);
  fonte(7.6, "normal");
  t("poderá realizar a solicitação do medicamento", xi + 4.2, y + 22);
  const xr = xi + wi + 3;
  traco(0.18);
  doc.line(xr, y + 18, X1 - 3, y + 18);
  if (d.incapaz === "sim") valor(d.responsavel, xr + 1, y + 17.2, X1 - xr - 6, 8);
  fonte(6.8, "normal");
  t("Nome do responsável", X1 - 30, y + 22.4);

  // ------------------------------------------------------------ 14, 15, 16, 17
  y += 27;
  caixa(X0, y, 118, 9.5, 2);
  rotulo("14- Nome do médico solicitante*", X0 + 2, y + 3.6);
  valor(d.medico, X0 + 2, y + 8, 114, 8.6);
  caixa(X0 + 120, y, X1 - X0 - 120, 19.5, 2);
  rotulo("17- Assinatura e carimbo do médico*", X0 + 122, y + 3.6);
  desenharCarimbo(doc, d.carimbo, X0 + 120 + (X1 - X0 - 120) / 2, y + 19, X1 - X0 - 124);
  caixa(X0, y + 10.5, 80, 9, 2);
  const w15 = rotulo("15- Número do CNS do médico solicitante*", X0 + 2, y + 13.8);
  celulas(d.cnsMedico, 15, X0 + 2, y + 14.8, 5.1, 4.2);
  void w15;
  caixa(X0 + 82, y + 10.5, 36, 9, 2);
  rotulo("16- Data da solicitação*", X0 + 84, y + 13.8);
  valor(d.data ? formatarData(d.data) : "", X0 + 86, y + 18, 30, 9);

  // ------------------------------------------------------------ 18 preenchido por
  y += 22;
  caixa(X0, y, X1 - X0, 14, 2, 0.34);
  fonte(7.8, "bold");
  t("18- CAMPOS ABAIXO PREENCHIDOS POR*:", X0 + 2, y + 5);
  let xc = X0 + 2 + doc.getTextWidth("18- CAMPOS ABAIXO PREENCHIDOS POR*:") + 3;
  for (const o of ["Paciente", "Mãe do paciente", "Responsável", "Médico solicitante"] as const) {
    xc += marca(xc, y + 5, d.preenchidoPor === o, o) + 3;
  }
  const wo = marca(X0 + 3, y + 11, d.preenchidoPor === "Outro", "Outro, informar nome:");
  const xon = X0 + 3 + wo + 2;
  traco(0.18);
  doc.line(xon, y + 11.4, 150, y + 11.4);
  if (d.preenchidoPor === "Outro") valor(d.outroNome, xon + 1, y + 10.6, 150 - xon, 8);
  fonte(7.6, "bold");
  t("e CPF", 153, y + 11);
  celulas(d.outroCpf, 11, 161, y + 7, 3.65, 5.2);

  // ------------------------------------------------------------ 19 a 23
  y += 16;
  caixa(X0, y, 114, 19, 2);
  rotulo("19- Raça/Cor/Etnia informado pelo paciente ou responsável*", X0 + 25, y + 3.4);
  const r1 = ["Branca", "Preta", "Parda"], r2 = ["Amarela", "Indígena", "Sem informação"];
  r1.forEach((r, i) => marca(X0 + 3, y + 8 + i * 4.6, d.raca === r, r));
  r2.forEach((r, i) => {
    const w = marca(X0 + 32, y + 8 + i * 4.6, d.raca === r, r === "Indígena" ? "Indígena. Informar Etnia:" : r);
    if (r === "Indígena" && d.raca === "Indígena") valor(d.etnia, X0 + 32 + w + 1, y + 8 + i * 4.6, 30, 7.6);
  });
  caixa(X0 + 116, y, X1 - X0 - 116, 12, 2);
  rotulo("20- Telefone(s) para contato do paciente", X0 + 118, y + 3.6);
  valor(d.telefone, X0 + 120, y + 9.4, X1 - X0 - 124, 9);

  caixa(X0, y + 21, 114, 10, 2);
  rotulo("21- Número do documento do paciente", X0 + 2, y + 24.2);
  const wc = marca(X0 + 3, y + 29.4, d.documento === "cpf", "CPF ou");
  marca(X0 + 3 + wc + 2, y + 29.4, d.documento === "cns", "CNS");
  const doccel = d.documento === "cpf" ? d.cpf : d.documento === "cns" ? d.cns : "";
  celulas(doccel, 15, X0 + 33, y + 25.4, 5.3, 5);
  caixa(X0, y + 33, 114, 8.5, 2);
  rotulo("22- Correio eletrônico do paciente", X0 + 2, y + 36.4);
  valor(d.email, X0 + 3, y + 40, 108, 8.4);
  caixa(X0 + 116, y + 14, X1 - X0 - 116, 27.5, 2);
  rotulo("23- Assinatura do responsável pelo preenchimento*", X0 + 118, y + 17.4);

  fonte(7.2, "bold");
  t("* CAMPOS DE PREENCHIMENTO OBRIGATÓRIO", X0 + 2, y + 46.5);

  return { doc, nomeArquivo: `medicamentos-especiais-${slug(d.nome) || "paciente"}-${d.data}.pdf` };
}

export async function gerarMedicamentosEspeciaisPdf(d: DadosMedicamentosEspeciais): Promise<void> {
  const { doc, nomeArquivo } = await montarMedicamentosEspeciaisPdf(d);
  doc.save(nomeArquivo);
}
