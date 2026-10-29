// Capa do prontuário domiciliar (A4 retrato), com a identificação do paciente e do cuidador.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
// Campo sem informação no cadastro sai com a linha em branco, para preencher à mão.
import type { jsPDF as JsPDF } from "jspdf";
import { desenharLogo, PROPORCAO_LOGO } from "./logo";

/** Todos os valores já formatados para impressão (datas dd/mm/aaaa); vazio = linha em branco. */
export type DadosCapa = {
  emad: string;
  admissao: string;
  prontuario: string;
  nome: string;
  nomeSocial: string;
  cpf: string;
  rg: string;
  mae: string;
  pai: string;
  cns: string;
  idade: string;
  nascimento: string;
  bairro: string;
  logradouro: string;
  numero: string;
  referencia: string;
  telefones: string;
  cuidador: string;
  cuidadorNomeSocial: string;
  cuidadorCpf: string;
  cuidadorRg: string;
  cuidadorCns: string;
  cuidadorNascimento: string;
  cuidadorTelefones: string[];
  uaps: string;
  acs: string;
  alta: string;
};

/** Profissionais da EMAD 27, impressos no alto da capa (função, nomes). */
const EQUIPE: [string, string][] = [
  ["Médico", "Pedro Victor Aguiar"],
  ["Enfermeiro", "João Paulo de Souza"],
  ["Fisioterapeuta", "Andreia Dutra"],
  ["Técnicos", "Clécia, Salva e Marcleane"],
];

const limpar =(t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function montarCapaPdf(d: DadosCapa): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({
    title: `Prontuário domiciliar — ${d.nome}`,
    author: `EMAD ${d.emad}`,
    subject: "Capa do prontuário domiciliar",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const X0 = 16, X1 = 194, MEIO = 105;
  const fonte = (tam: number, estilo: "normal" | "bold" = "normal", cor: [number, number, number] = [20, 20, 20]) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(cor[0], cor[1], cor[2]);
  };
  const traco = (x1: number, y1: number, x2: number, y2: number, esp = 0.22) => {
    doc.setDrawColor(75, 85, 85);
    doc.setLineWidth(esp);
    doc.line(x1, y1, x2, y2);
  };

  /** Rótulo seguido do valor sobre a linha, de x até xFim; o valor diminui até caber. */
  const campo = (rotulo: string, valor: string, x: number, y: number, xFim: number) => {
    fonte(9.5, "bold", [70, 85, 85]);
    const r = rotulo === "/" ? rotulo : `${rotulo}:`;
    doc.text(r, x, y);
    const inicio = x + doc.getTextWidth(r) + 1;
    traco(inicio, y + 0.9, xFim, y + 0.9);
    const v = limpar(valor ?? "").trim();
    if (!v) return;
    let tam = 10.5;
    fonte(tam);
    while (tam > 6.5 && doc.getTextWidth(v) > xFim - inicio - 2) {
      tam -= 0.5;
      doc.setFontSize(tam);
    }
    doc.text(v, inicio + 1, y - 0.4);
  };

  // equipe, no canto superior esquerdo
  fonte(10, "bold");
  doc.text("Equipe", X0 - 4, 12);
  EQUIPE.forEach(([funcao, nomes], i) => {
    const yl = 16.6 + i * 4.4;
    fonte(9, "bold", [70, 85, 85]);
    doc.text(`${funcao}:`, X0 - 4, yl);
    const x = X0 - 4 + doc.getTextWidth(`${funcao}:`) + 1.5;
    fonte(9);
    doc.text(nomes, x, yl);
  });

  // título
  fonte(20, "bold");
  doc.text("PRONTUÁRIO DOMICILIAR", MEIO, 38, { align: "center" });
  fonte(16, "bold");
  doc.text("EMAD:", MEIO - 2, 47, { align: "right" });
  fonte(16);
  doc.text(limpar(d.emad), MEIO + 2, 47);
  traco(MEIO, 48.2, MEIO + 26, 48.2, 0.4);

  // logotipo
  const larguraLogo = 84;
  desenharLogo(doc, MEIO - larguraLogo / 2, 51, larguraLogo);
  const fimLogo = 51 + larguraLogo * PROPORCAO_LOGO;

  // quadro de identificação
  const topo = fimLogo + 3;
  const base = 266;
  doc.setDrawColor(40, 45, 45);
  doc.setLineWidth(0.4);
  doc.rect(X0 - 4, topo, X1 - X0 + 8, base - topo);
  doc.line(X0 - 4, topo + 9, X1 + 4, topo + 9);
  fonte(11.5, "bold");
  doc.text("IDENTIFICAÇÃO DO PACIENTE", MEIO, topo + 6.2, { align: "center" });

  let y = topo + 17;
  const passo = 9.6;
  const prox = (n = 1) => { y += passo * n; };

  campo("Data da admissão", d.admissao, X0, y, 98);
  campo("Prontuário", d.prontuario, 120, y, X1);
  prox();
  campo("Nome", d.nome, X0, y, 128);
  campo("Nome social", d.nomeSocial, 131, y, X1);
  prox();
  campo("CPF", d.cpf, X0, y, 98);
  campo("RG", d.rg, 101, y, X1);
  prox();
  campo("Nome da mãe", d.mae, X0, y, 108);
  campo("Nome do pai", d.pai, 111, y, X1);
  prox();
  campo("Cartão SUS", d.cns, X0, y, 92);
  campo("Idade", d.idade, 95, y, 120);
  campo("Data de nascimento", d.nascimento, 123, y, X1);
  prox();
  campo("Bairro", d.bairro, X0, y, 72);
  campo("Logradouro", d.logradouro, 75, y, 166);
  campo("Nº", d.numero, 169, y, X1);
  prox();
  campo("Ponto de referência", d.referencia, X0, y, 120);
  campo("Telefones", d.telefones, 123, y, X1);
  prox(1.4);

  campo("Cuidador", d.cuidador, X0, y, 128);
  campo("Nome social", d.cuidadorNomeSocial, 131, y, X1);
  prox();
  campo("CPF", d.cuidadorCpf, X0, y, 98);
  campo("RG", d.cuidadorRg, 101, y, X1);
  prox();
  campo("Cartão SUS", d.cuidadorCns, X0, y, 120);
  campo("Data de nascimento", d.cuidadorNascimento, 123, y, X1);
  prox();
  campo("Telefones para contato", d.cuidadorTelefones[0] ?? "", X0, y, 112);
  campo("/", d.cuidadorTelefones[1] ?? "", 113, y, 160);
  prox(1.4);

  campo("UAPS referência", d.uaps, X0, y, 140);
  campo("ACS", d.acs, 143, y, X1);
  prox(1.4);
  campo("Data da alta", d.alta, X0, y, 80);

  // contatos fixos do programa
  fonte(12.5, "bold");
  doc.text("CONTATO PARA INTERCORRÊNCIAS: 3771-66-91 / 3771-66-83", MEIO, base - 13, { align: "center" });
  fonte(9.5, "bold");
  doc.text("EM CASO DE ATENDIMENTO DE URGÊNCIA E EMERGÊNCIA ACIONAR O SAMU (192).", MEIO, base - 6, { align: "center" });

  // rodapé
  fonte(9, "bold", [70, 85, 85]);
  doc.text(["Prefeitura de Fortaleza", "Secretaria Municipal de Saúde"], X0, 277, { lineHeightFactor: 1.4 });
  doc.text(["SUS", "Sistema Único de Saúde"], X1, 277, { align: "right", lineHeightFactor: 1.4 });

  return { doc, nomeArquivo: `capa-prontuario-${slug(d.nome) || "paciente"}.pdf` };
}

export async function gerarCapaPdf(d: DadosCapa): Promise<void> {
  const { doc, nomeArquivo } = await montarCapaPdf(d);
  doc.save(nomeArquivo);
}
