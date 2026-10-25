// Instrumento de Avaliação da Elegibilidade e Complexidade da Atenção Domiciliar (IAEC-AD, versão set/2023).
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import { formatarData } from "./opcoes";

export const INDICACOES = [
  "Condição de saúde crônica agudizada que requeira atendimento multiprofissional no domicílio, com foco no melhor controle de sintomas causados pela condição de base, incluindo situações de cuidados paliativos.",
  "Lesão de pele de difícil manejo pela equipe assistente que requeira avaliação semanal em domicílio, além do possível uso de coberturas especiais.",
  "Reabilitação multiprofissional com possibilidade de ganho funcional, especialmente após cirurgia de grande porte, evento agudo, fratura ou hospitalização prolongada.",
  "Uso de antibioticoterapia parenteral domiciliar ou outra medicação parenteral seriada, desde que haja mínima estabilidade clínica para permanência no domicílio.",
  "Prematuridade e baixo peso em bebês com necessidade de ganho ponderal.",
  "Nenhuma das condições acima.",
] as const;

export const GATILHOS = [
  { id: "ad2", pontos: 5, texto: "AD2: Necessidade diária de curativos complexos e/ ou medicação parenteral (IM/EV/SC - exceto insulina) – 5 pontos" },
  { id: "ad3", pontos: 5, texto: "AD3: Necessidade de tratamentos de alta complexidade ou intensidade no domicílio: transfusão sanguínea, paracentese, nutrição parenteral, cuidados paliativos sequenciais para manejo de sintomas mal controlados, dentre outros E/OU uso de Ventilação Mecânica Invasiva – 5 pontos" },
] as const;

export type Opcao = { texto: string; pontos: number };
export type Grupo = { id: string; titulo: string; opcoes: Opcao[] };
export type Secao = { titulo: string; nota?: string; grupos: Grupo[] };

const o = (texto: string, pontos: number): Opcao => ({ texto, pontos });
const dependencia = (): Opcao[] => [o("Independente", 0), o("Dependente parcial", 1), o("Dependente completo", 2)];

export const SECOES: Secao[] = [
  {
    titulo: "USO DO SISTEMA DE SAÚDE",
    grupos: [
      { id: "internacao", titulo: "Histórico de internação hospitalar nos últimos três meses.", opcoes: [o("Nenhuma internação hospitalar nos últimos 3 meses", 0), o("Pelo menos uma internação hospitalar nos últimos 3 meses", 1), o("Duas ou mais internações hospitalares nos últimos 3 meses", 2), o("Pelo menos uma internação em UTI nos últimos 3 meses", 4)] },
      { id: "urgencia", titulo: "Frequência de procura por serviços de urgência nos últimos três meses (SAMU, UPA, Pronto-Socorro)", opcoes: [o("Nenhuma procura por serviço de urgência nos últimos 3 meses", 0), o("Procurou por serviço de urgência 02 vezes nos últimos 3 meses", 1), o("Procurou por serviço de urgência de 03 a 04 vezes nos últimos 3 meses", 2), o("Procurou por serviço de urgência 05 ou mais vezes nos últimos 3 meses", 3)] },
      { id: "permanencia", titulo: "Tempo de permanência hospitalar nos últimos três meses. Considerar o maior período no caso de múltiplas internações prévias.", opcoes: [o("Sem história de internação prévia", 0), o("Até 07 dias", 1), o("De 07 a 30 dias", 2), o("Mais de 30 dias", 3)] },
    ],
  },
  {
    titulo: "VULNERABILIDADE SOCIAL",
    grupos: [{ id: "moradia", titulo: "Relação morador-cômodo: divida o número de moradores pelo número de cômodos, selecionando a opção apropriada.", opcoes: [o("Menor que 01", 0), o("Igual a 01", 1), o("Maior que 01", 2)] }],
  },
  {
    titulo: "SUPORTE FAMILIAR/CUIDADO",
    grupos: [{ id: "suporte", titulo: "Identifique o suporte de cuidado, seja da família ou de cuidadores.", opcoes: [o("Paciente com suporte familiar adequado", 0), o("Paciente com suporte familiar inadequado", 1)] }],
  },
  {
    titulo: "FUNCIONALIDADE",
    nota: "Preencha este campo considerando a idade do paciente, para posterior identificação do grau de dependência, de acordo com sua faixa etária.",
    grupos: [
      { id: "desenvolvimento", titulo: "Para crianças de até 07 anos: em relação ao desenvolvimento neuropsicomotor", opcoes: [o("Acompanha o desenvolvimento neuropsicomotor", 0), o("Não acompanha o desenvolvimento neuropsicomotor", 6)] },
      { id: "banho", titulo: "Para crianças maiores de 07 anos, adultos e idosos: capacidade para tomar banho", opcoes: dependencia() },
      { id: "alimentar", titulo: "Capacidade para alimentar-se", opcoes: dependencia() },
      { id: "locomover", titulo: "Capacidade para locomover-se", opcoes: dependencia() },
    ],
  },
  {
    titulo: "POLIFARMÁCIA",
    grupos: [{ id: "polifarmacia", titulo: "Uso de cinco ou mais medicações de uso contínuo, diariamente", opcoes: [o("Não", 0), o("Sim", 1)] }],
  },
];

export type RespostasIaec = {
  indicacoes: number[];
  gatilhos: string[];
  /** id do grupo -> índice da opção escolhida */
  respostas: Record<string, number>;
};

export type ResultadoIaec = { porSecao: Record<string, number>; gatilhos: number; total: number; modalidade: "AD1" | "AD2" | "AD3"; porGatilho: boolean };

export function calcularIaec(r: RespostasIaec): ResultadoIaec {
  const porSecao: Record<string, number> = {};
  let total = 0;
  for (const s of SECOES) {
    let p = 0;
    for (const g of s.grupos) {
      const i = r.respostas[g.id];
      if (i !== undefined && g.opcoes[i]) p += g.opcoes[i].pontos;
    }
    porSecao[s.titulo] = p;
    total += p;
  }
  const gatilhos = GATILHOS.filter((g) => r.gatilhos.includes(g.id)).reduce((a, g) => a + g.pontos, 0);
  total += gatilhos;
  const porGatilho = r.gatilhos.includes("ad2") || r.gatilhos.includes("ad3");
  const modalidade = r.gatilhos.includes("ad3") ? "AD3" : r.gatilhos.includes("ad2") ? "AD2" : total >= 16 ? "AD3" : total >= 10 ? "AD2" : "AD1";
  return { porSecao, gatilhos, total, modalidade, porGatilho };
}

export type DadosIaec = RespostasIaec & { nome: string; data: string };

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function montarIaecPdf(d: DadosIaec): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({
    title: `IAEC-AD — ${d.nome}`,
    author: "EMAD 27",
    subject: "Instrumento de Avaliação da Elegibilidade e Complexidade da Atenção Domiciliar",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });
  const res = calcularIaec(d);

  const X0 = 8, X1 = 202, XL = 52, XP = 180;
  const fonte = (tam: number, estilo: "normal" | "bold" | "italic" = "normal", cor: [number, number, number] = [20, 20, 20]) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(cor[0], cor[1], cor[2]);
  };
  const caixa = (x: number, y: number, w: number, h: number, esp = 0.18) => {
    doc.setDrawColor(75, 85, 85);
    doc.setLineWidth(esp);
    doc.rect(x, y, w, h);
  };
  const t = (s: string, x: number, y: number, op: { align?: "left" | "center" | "right" } = {}) => doc.text(limpar(s), x, y, op);

  // ------------------------------------------------------------ cabeçalho
  fonte(9.6, "bold", [20, 60, 120]);
  t("Melhor em Casa", 24, 15, { align: "center" });
  fonte(5.4, "normal", [110, 110, 110]);
  t("Versão Set 2023", 24, 19);
  fonte(11, "bold");
  doc.text(["Instrumento de Avaliação da Elegibilidade e Complexidade", "da Atenção Domiciliar (IAEC-AD)"].map(limpar), 105, 13, { align: "center", lineHeightFactor: 1.35 });
  fonte(8.4, "bold", [20, 60, 120]);
  t("SAES", 168, 15);
  fonte(5, "normal", [110, 110, 110]);
  doc.text(["Secretaria de", "Atenção Especializada à Saúde"].map(limpar), 180, 13.5, { lineHeightFactor: 1.3 });
  fonte(8.2, "bold");
  t(`Paciente: ${d.nome}`, X0, 25.2);
  t(`Data: ${formatarData(d.data)}`, X1, 25.2, { align: "right" });

  let y = 28;
  const faixa = (titulo: string, rotuloPontos = "") => {
    doc.setFillColor(205, 205, 205);
    doc.rect(X0, y, X1 - X0, 4.8, "FD");
    fonte(8, "bold");
    t(titulo, (X0 + X1) / 2, y + 3.5, { align: "center" });
    if (rotuloPontos) {
      fonte(7, "bold");
      t(rotuloPontos, (XP + X1) / 2, y + 3.4, { align: "center" });
    }
    y += 4.8;
  };
  const LH = 3.5;
  /** Desenha as opções de um grupo e devolve a altura usada. */
  const opcoes = (lista: { texto: string; marcado: boolean; sufixo?: string }[], x: number, w: number, yy: number) => {
    let cy = yy + 0.8;
    for (const op of lista) {
      fonte(7.2, "normal");
      const linhas = doc.splitTextToSize(limpar(op.texto + (op.sufixo ?? "")), w - 7) as string[];
      t("(", x + 1.2, cy + 2.6);
      if (op.marcado) {
        fonte(7.6, "bold");
        t("X", x + 2.9, cy + 2.6, { align: "center" });
        fonte(7.2, "normal");
      }
      t(")", x + 4.3, cy + 2.6);
      doc.text(linhas, x + 6.4, cy + 2.6, { lineHeightFactor: 1.1 });
      cy += linhas.length * LH + 0.5;
    }
    return cy - yy + 0.3;
  };
  const alturaOpcoes = (lista: { texto: string; sufixo?: string }[], w: number) => {
    fonte(7.2, "normal");
    return lista.reduce((a, op) => a + (doc.splitTextToSize(limpar(op.texto + (op.sufixo ?? "")), w - 7) as string[]).length * LH + 0.5, 1.1);
  };
  const esquerda = (texto: string, yy: number, h: number, negrito = false) => {
    fonte(7.2, negrito ? "bold" : "normal");
    const linhas = doc.splitTextToSize(limpar(texto), XL - X0 - 4) as string[];
    doc.text(linhas, (X0 + XL) / 2, yy + h / 2 - ((linhas.length - 1) * LH) / 2 + 1.1, { align: "center", lineHeightFactor: 1.1 });
  };

  // ------------------------------------------------------------ indicações clínicas
  faixa("INDICAÇÕES CLÍNICAS MAIS FREQUENTES PARA AD2/AD3");
  {
    const lista = INDICACOES.map((texto, i) => ({ texto, marcado: d.indicacoes.includes(i) }));
    const h = alturaOpcoes(lista, X1 - XL);
    caixa(X0, y, XL - X0, h);
    caixa(XL, y, X1 - XL, h);
    esquerda("Selecione uma ou mais das seguintes opções para definir a principal indicação clínica do paciente.", y, h);
    opcoes(lista, XL, X1 - XL, y);
    y += h;
  }

  // ------------------------------------------------------------ sistema de pontuação
  faixa("SISTEMA DE PONTUAÇÃO");
  faixa("INDICAÇÕES CLÍNICAS ESPECIAIS OU GATILHOS", "Pontuação");
  {
    const lista = GATILHOS.map((g) => ({ texto: g.texto, marcado: d.gatilhos.includes(g.id) }));
    const h = alturaOpcoes(lista, XP - XL);
    caixa(X0, y, XL - X0, h);
    caixa(XL, y, XP - XL, h);
    caixa(XP, y, X1 - XP, h);
    esquerda("Selecione uma ou mais opções a seguir. (A presença de qualquer uma delas já classifica o usuário como AD2 ou AD3, INDEPENDENTE DA PONTUAÇÃO FINAL).", y, h);
    opcoes(lista, XL, XP - XL, y);
    fonte(11, "bold");
    t(res.gatilhos ? String(res.gatilhos) : "", (XP + X1) / 2, y + h / 2 + 1.5, { align: "center" });
    y += h;
  }

  // ------------------------------------------------------------ seções pontuadas
  for (const s of SECOES) {
    faixa(s.titulo, "Pontuação");
    if (s.nota) {
      caixa(X0, y, X1 - X0, 4.6);
      fonte(6.8, "italic");
      t(s.nota, (X0 + XP) / 2, y + 3.2, { align: "center" });
      y += 4.6;
    }
    const yIni = y;
    for (const g of s.grupos) {
      const lista = g.opcoes.map((op, i) => ({ texto: op.texto, marcado: d.respostas[g.id] === i, sufixo: ` – ${op.pontos} ${op.pontos === 1 ? "ponto" : "pontos"}` }));
      fonte(7.2, "normal");
      const hTitulo = (doc.splitTextToSize(limpar(g.titulo), XL - X0 - 4) as string[]).length * LH + 2;
      const h = Math.max(alturaOpcoes(lista, XP - XL), hTitulo);
      caixa(X0, y, XL - X0, h);
      caixa(XL, y, XP - XL, h);
      esquerda(g.titulo, y, h);
      opcoes(lista, XL, XP - XL, y);
      y += h;
    }
    caixa(XP, yIni, X1 - XP, y - yIni);
    fonte(11, "bold");
    t(String(res.porSecao[s.titulo] || ""), (XP + X1) / 2, yIni + (y - yIni) / 2 + 1.5, { align: "center" });
  }

  // ------------------------------------------------------------ pontuação final e modalidade
  caixa(X0, y, XP - X0, 7);
  caixa(XP, y, X1 - XP, 7);
  fonte(10, "bold");
  t("PONTUAÇÃO FINAL", XP - 3, y + 5, { align: "right" });
  fonte(12, "bold");
  t(String(res.total), (XP + X1) / 2, y + 5.2, { align: "center" });
  y += 8.5;

  const faixas: [string, string][] = [["AD1", "Até 09 pontos"], ["AD2", "De 10 a 15 pontos"], ["AD3", "Maior ou igual a 16 pontos"]];
  doc.setFillColor(205, 205, 205);
  doc.rect(X0, y, 96, 5, "FD");
  doc.rect(X0 + 96, y, X1 - X0 - 96, 5, "FD");
  fonte(8.4, "bold");
  t("Modalidade AD", X0 + 48, y + 3.6, { align: "center" });
  t("Pontuação no instrumento", X0 + 96 + (X1 - X0 - 96) / 2, y + 3.6, { align: "center" });
  y += 5;
  for (const [mod, texto] of faixas) {
    const ativo = res.modalidade === mod;
    if (ativo) {
      doc.setFillColor(215, 240, 222);
      doc.rect(X0, y, X1 - X0, 5, "F");
    }
    caixa(X0, y, 96, 5);
    caixa(X0 + 96, y, X1 - X0 - 96, 5);
    fonte(8.4, ativo ? "bold" : "normal");
    t(ativo ? `${mod}  (X)` : mod, X0 + 48, y + 3.6, { align: "center" });
    t(texto, X0 + 96 + (X1 - X0 - 96) / 2, y + 3.6, { align: "center" });
    y += 5;
  }
  fonte(6.8, "italic");
  t(res.porGatilho ? `Classificação definida por indicação clínica especial (gatilho): ${res.modalidade}, independente da pontuação.` : `Classificação pela pontuação final: ${res.modalidade}.`, X0, y + 4);

  return { doc, nomeArquivo: `iaec-ad-${slug(d.nome) || "paciente"}-${d.data}.pdf` };
}

export async function gerarIaecPdf(d: DadosIaec): Promise<void> {
  const { doc, nomeArquivo } = await montarIaecPdf(d);
  doc.save(nomeArquivo);
}
