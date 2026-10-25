// Avaliação de Elegibilidade e Admissão (para uso exclusivo de SAD) — ficha e-SUS AB v2.1.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import { formatarData } from "./opcoes";

export const PROCEDENCIAS = ["Atenção Básica", "Internação hospitalar", "Urgência e emergência", "CACON/UNACON", "Iniciativa do paciente ou terceiros", "Outros"] as const;
export const CONDICOES_ESQ = [
  "Acamado", "Domiciliado", "Úlceras/feridas (grau III ou IV)", "Acompanhamento nutricional", "Uso de sonda nasogástrica - SNG",
  "Uso de sonda nasoenteral - SNE", "Uso de gastrostomia", "Uso de colostomia", "Uso de cistostomia", "Uso de sonda vesical de demora - SVD",
  "Acompanhamento pré-operatório", "Acompanhamento pós-operatório",
] as const;
export const CONDICOES_DIR = [
  "Adaptação ao uso de órtese/prótese", "Reabilitação domiciliar", "Cuidados paliativos oncológicos", "Cuidados paliativos não oncológicos",
  "Oxigenoterapia domiciliar", "Uso de traqueostomia", "Uso de aspirador de vias aéreas para higiene brônquica", "Suporte ventilatório não invasivo - CPAP",
  "Suporte ventilatório não invasivo - BIPAP", "Diálise peritonial", "Paracentese", "Medicação parenteral",
] as const;
export const ELEGIVEL = ["AD1", "AD2", "AD3"] as const;
export const DESTINOS = ["Admissão na própria Emad", "Encaminhado para outra Emad", "Encaminhado para a Atenção Básica (AD1)", "Outro encaminhamento"] as const;
export const MOTIVOS_INELEGIVEL = [
  "Instabilidade clínica com necessidade de monitorização contínua",
  "Necessidade de propedêutica complementar, com demanda potencial para a realização de vários procedimentos diagnósticos, com urgência",
  "Outro motivo clínico",
  "Ausência de cuidador (em casos com necessidade)",
  "Outras condições sociais e/ou famil. impeditivas do cuidado domiciliar",
] as const;
export const RACAS_AEA = ["Branca", "Preta", "Parda", "Amarela", "Indígena"] as const;
export const NACIONALIDADES = ["Brasileira", "Naturalizado", "Estrangeiro"] as const;
export const VINCULOS_CUIDADOR = ["Não possui", "Cônjuge/Companheiro(a)", "Filho(a)/Enteado(a)", "Pai/Mãe", "Avó/Avô", "Neto(a)", "Irmão(ã)", "Outro"] as const;

export type DadosElegibilidade = {
  // profissional (digitado pelo médico)
  cnsProfissional: string; cbo: string; cnes: string; ine: string; data: string; turno: "M" | "T" | "N" | "";
  // cidadão (cadastro)
  cnsCidadao: string; nascimento: string; sexo: string;
  procedencia: string;
  condicoes: string[];
  cidPrincipal: string; cidSecundario1: string; cidSecundario2: string;
  elegivel: string; inelegivel: boolean; destino: string; motivos: string[];
  // admissão (cadastro + escolhas)
  nome: string; nomeSocial: string; raca: string; etnia: string; nis: string;
  mae: string; pai: string; nacionalidade: string;
  cep: string; municipio: string; uf: string; bairro: string; tipoLogradouro: string; logradouro: string; numero: string; complemento: string; referencia: string;
  email: string; telResidencia: string; telContato: string;
  cuidador: string; cnsCuidador: string;
};

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const soAlfanum = (t: string) => t.replace(/[^0-9A-Za-z]/g, "").toUpperCase();

type Cor = [number, number, number];
const PRETO: Cor = [20, 20, 20];
const CINZA: Cor = [100, 100, 100];

export async function montarElegibilidadePdf(d: DadosElegibilidade): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({
    title: `Avaliação de elegibilidade e admissão — ${d.nome}`,
    author: "EMAD 27",
    subject: "Avaliação de elegibilidade e admissão (SAD)",
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
  const caixa = (x: number, y: number, w: number, h: number, r = 2, esp = 0.26) => {
    traco(esp);
    doc.roundedRect(x, y, w, h, r, r);
  };
  const linha = (x1: number, y1: number, x2: number, y2: number, esp = 0.18) => {
    traco(esp);
    doc.line(x1, y1, x2, y2);
  };
  const t = (s: string, x: number, y: number, o: { align?: "left" | "center" | "right" } = {}) => doc.text(limpar(s), x, y, o);
  const rot = (s: string, x: number, y: number, bold = true) => {
    fonte(6.6, bold ? "bold" : "normal", [70, 85, 85]);
    t(s, x, y);
    return doc.getTextWidth(limpar(s));
  };
  const valor = (s: string, x: number, y: number, larg: number, tam = 8.2) => {
    fonte(tam);
    const l = (doc.splitTextToSize(limpar(s), larg) as string[])[0] ?? "";
    t(l, x, y);
  };
  const celulas = (v0: string, n: number, x: number, y: number, w: number, h = 4.2) => {
    const v = soAlfanum(v0).slice(0, n);
    traco(0.16);
    for (let i = 0; i < n; i++) {
      doc.rect(x + i * w, y, w, h);
      if (v[i]) {
        fonte(7.6, "bold");
        t(v[i], x + i * w + w / 2, y + h - 1.1, { align: "center" });
      }
    }
  };
  const quadrado = (x: number, y: number, ativo: boolean, texto: string, tam = 6.6) => {
    traco(0.22);
    doc.rect(x, y - 2.4, 2.8, 2.8);
    if (ativo) {
      fonte(7, "bold");
      t("X", x + 1.4, y - 0.1, { align: "center" });
    }
    fonte(tam);
    t(texto, x + 4, y);
    return 4 + doc.getTextWidth(limpar(texto));
  };
  const circulo = (x: number, y: number, ativo: boolean, texto: string, tam = 6.6) => {
    traco(0.22);
    doc.circle(x + 1.3, y - 1, 1.3);
    if (ativo) {
      fonte(7, "bold");
      t("X", x + 1.3, y - 0.1, { align: "center" });
    }
    fonte(tam);
    t(texto, x + 3.6, y);
    return 3.6 + doc.getTextWidth(limpar(texto));
  };

  // ------------------------------------------------------------ cabeçalho
  caixa(X0, 12, 118, 19);
  fonte(13, "bold");
  t("SAÚDE", 22, 23);
  fonte(5, "normal", CINZA);
  t("ATENÇÃO BÁSICA", 22, 26.4);
  fonte(10, "bold");
  doc.text(["AVALIAÇÃO DE ELEGIBILIDADE", "E ADMISSÃO"].map(limpar), 62, 18.4, { lineHeightFactor: 1.15 });
  fonte(9.4, "bold");
  t("(para uso exclusivo de SAD)", 62, 27.4);
  caixa(128, 12, 74, 19);
  linha(128, 21.5, 202, 21.5);
  linha(172, 12, 172, 31);
  rot("DIGITADO POR:", 130, 15.5, false);
  rot("DATA:", 174, 15.5, false);
  rot("CONFERIDO POR:", 130, 25, false);
  rot("FOLHA Nº:", 174, 25, false);

  // ------------------------------------------------------------ profissional
  caixa(X0, 33, X1 - X0, 21);
  rot("CNS DO PROFISSIONAL*", X0 + 2, 37.6);
  celulas(d.cnsProfissional, 15, X0 + 2, 39, 4.1, 4.4);
  rot("CBO*", 74, 37.6);
  celulas(d.cbo, 6, 74, 39, 4.1, 4.4);
  rot("CNES*", 104, 37.6);
  celulas(d.cnes, 7, 104, 39, 4.1, 4.4);
  rot("INE*", 138, 37.6);
  celulas(d.ine, 10, 138, 39, 3.5, 4.4);
  rot("DATA*", 176, 37.6);
  valor(d.data ? formatarData(d.data) : "", 176, 42.4, 26, 8.4);
  rot("CNS DO PROFISSIONAL", X0 + 2, 48.4, false);
  celulas("", 15, X0 + 2, 49.6, 4.1, 3.6);
  rot("CBO", 74, 48.4, false);
  celulas("", 6, 74, 49.6, 4.1, 3.6);
  rot("CNES", 104, 48.4, false);
  celulas("", 7, 104, 49.6, 4.1, 3.6);
  rot("INE", 138, 48.4, false);
  celulas("", 10, 138, 49.6, 3.5, 3.6);
  rot("TURNO*", 176, 50.6);
  (["M", "T", "N"] as const).forEach((tu, i) => {
    traco(0.22);
    doc.circle(190 + i * 4.6, 49.6, 1.7);
    fonte(6, "bold");
    t(d.turno === tu ? "X" : tu, 190 + i * 4.6, 50.4, { align: "center" });
  });

  // ------------------------------------------------------------ cidadão
  caixa(X0, 56, X1 - X0, 9);
  rot("IDENTIFICAÇÃO DO USUÁRIO/CIDADÃO", X0 + 4, 59.2);
  rot("CNS DO CIDADÃO*", X0 + 2, 63.2);
  celulas(d.cnsCidadao, 15, X0 + 28, 59.8, 4, 4.4);
  rot("DATA NASC.*", 106, 63.2);
  valor(d.nascimento ? formatarData(d.nascimento) : "", 124, 63.2, 24, 8.2);
  rot("SEXO:*", 154, 63.2);
  circulo(165, 63.8, d.sexo === "F", "F", 7);
  circulo(178, 63.8, d.sexo === "M", "M", 7);

  // ------------------------------------------------------------ procedência
  caixa(X0, 67, X1 - X0, 8);
  rot("PROCEDÊNCIA (ASSINALAR)*", X0 + 4, 70.2);
  let xp = X0 + 2;
  for (const p of PROCEDENCIAS) xp += circulo(xp, 73.6, d.procedencia === p, p, 6.1) + 2.6;

  // ------------------------------------------------------------ condições
  caixa(X0, 77, X1 - X0, 52);
  rot("CONDIÇÃO(ÕES) AVALIADA(S)", X0 + 4, 80.2);
  CONDICOES_ESQ.forEach((c, i) => quadrado(X0 + 3, 85.4 + i * 3.7, d.condicoes.includes(c), c, 6.3));
  CONDICOES_DIR.forEach((c, i) => quadrado(105, 85.4 + i * 3.7, d.condicoes.includes(c), c, 6.3));
  linha(103, 82, 103, 129);

  // ------------------------------------------------------------ CIDs
  caixa(X0, 131, X1 - X0, 7);
  rot("CID-10 (principal)*", X0 + 2, 135.2);
  valor(d.cidPrincipal, X0 + 32, 135.4, 28, 8.2);
  linha(X0 + 31, 136.2, X0 + 58, 136.2);
  rot("CID-10 (secundário)", 74, 135.2, false);
  valor(d.cidSecundario1, 102, 135.4, 28, 8.2);
  linha(99, 136.2, 128, 136.2);
  rot("CID-10 (secundário)", 138, 135.2, false);
  valor(d.cidSecundario2, 166, 135.4, 28, 8.2);
  linha(163, 136.2, 192, 136.2);

  // ------------------------------------------------------------ conclusão/destino
  caixa(X0, 140, X1 - X0, 34);
  rot("CONCLUSÃO/DESTINO *", X0 + 4, 143.2);
  fonte(6.4);
  t("ELEGÍVEL: (ver legenda)", X0 + 2, 147);
  let xe = X0 + 36;
  for (const a of ELEGIVEL) xe += circulo(xe, 147.4, d.elegivel === a, a) + 2.4;
  circulo(105, 147.4, d.inelegivel, "INELEGÍVEL");
  linha(X0, 149.2, X1, 149.2);
  DESTINOS.forEach((x, i) => {
    circulo(X0 + 2, 153.6 + i * 5.2, d.destino === x, x);
    linha(X0, 155.4 + i * 5.2, 102, 155.4 + i * 5.2, 0.2);
  });
  linha(103, 140, 103, 174);
  const motiv = [153.6, 158.6, 164, 168.2, 172.2];
  MOTIVOS_INELEGIVEL.forEach((m, i) => {
    quadrado(105, motiv[i], d.motivos.includes(m), "", 6);
    fonte(5.9);
    const l = (doc.splitTextToSize(limpar(m), 90) as string[]).slice(0, 2);
    doc.text(l, 110, motiv[i] - 0.3, { lineHeightFactor: 1.1 });
  });

  // ------------------------------------------------------------ identificação para admissão
  caixa(X0, 176, X1 - X0, 51);
  rot("IDENTIFICAÇÃO DO USUÁRIO/CIDADÃO PARA ADMISSÃO", X0 + 4, 179.2);
  rot("NOME COMPLETO:**", X0 + 2, 184);
  valor(d.nome, X0 + 28, 184, X1 - X0 - 32, 8.6);
  linha(X0 + 27, 185, X1 - 2, 185);
  linha(X0 + 2, 189.6, X1 - 2, 189.6);
  rot("NOME SOCIAL:", X0 + 2, 193.8, false);
  valor(d.nomeSocial, X0 + 24, 193.8, 100, 8.2);
  linha(X0 + 23, 194.6, X1 - 2, 194.6);
  rot("RAÇA/COR:**", X0 + 2, 199.4);
  let xr = X0 + 22;
  for (const r of RACAS_AEA) xr += circulo(xr, 199.8, d.raca === r, r, 6.1) + 2.2;
  rot("Etnia:***", 130, 199.4);
  valor(d.etnia, 142, 199.4, 28, 7.6);
  rot("Nº NIS (PIS/Pasep)", 158, 199.4, false);
  linha(X0, 201.2, X1, 201.2, 0.2);
  rot("NOME COMPLETO DA MÃE:**", X0 + 2, 205.4);
  valor(d.mae, X0 + 40, 205.4, 120, 8.2);
  linha(X0 + 39, 206.2, X1 - 2, 206.2);
  quadrado(X0 + 40, 210, !d.mae, "Desconhecido", 6.2);
  rot("NOME COMPLETO DO PAI:**", X0 + 2, 214.6);
  valor(d.pai, X0 + 40, 214.6, 120, 8.2);
  linha(X0 + 39, 215.4, X1 - 2, 215.4);
  quadrado(X0 + 40, 219.2, !d.pai, "Desconhecido", 6.2);
  rot("NACIONALIDADE:**", X0 + 2, 224);
  let xn = X0 + 30;
  for (const n of NACIONALIDADES) xn += circulo(xn, 224.4, d.nacionalidade === n, n, 6.1) + 2.4;
  rot("PAÍS DE NASCIMENTO:***", 104, 224);
  rot("DATA DE NATURALIZAÇÃO:***", 150, 224);

  // ------------------------------------------------------------ endereço
  caixa(X0, 229, X1 - X0, 24);
  rot("ENDEREÇO/LOCAL DE PERMANÊNCIA", X0 + 4, 232);
  rot("CEP:**", X0 + 2, 236.6);
  valor(d.cep, X0 + 12, 236.6, 40, 8.2);
  rot("MUNICÍPIO:**", 66, 236.6);
  valor(d.municipio, 84, 236.6, 90, 8.2);
  rot("UF:**", 180, 236.6);
  valor(d.uf, 187, 236.6, 12, 8.2);
  linha(X0, 238.4, X1, 238.4, 0.2);
  rot("BAIRRO:**", X0 + 2, 242.6);
  valor(d.bairro, X0 + 18, 242.6, 44, 8.2);
  rot("TIPO DE LOGRADOURO:**", 66, 242.6);
  valor(d.tipoLogradouro, 100, 242.6, 20, 8.2);
  rot("NOME DO LOGRADOURO:**", 124, 242.6);
  valor(d.logradouro, 156, 242.6, 44, 7.6);
  linha(X0, 244.4, X1, 244.4, 0.2);
  rot("NÚMERO:**", X0 + 2, 249);
  valor(d.numero, X0 + 18, 249, 20, 8.2);
  circulo(X0 + 40, 249.4, !d.numero, "Sem número", 6.2);
  rot("COMPLEMENTO:", 66, 249, false);
  valor(d.complemento, 86, 249, 40, 7.6);
  rot("PONTO DE REFERÊNCIA:", 130, 249, false);
  valor(d.referencia, 160, 249, 40, 7.2);

  // ------------------------------------------------------------ telefones e cuidador
  caixa(X0, 255, X1 - X0, 8);
  rot("TELEFONES PARA CONTATO", X0 + 4, 258);
  rot("TEL. RESIDÊNCIA:", X0 + 2, 261.8, false);
  valor(d.telResidencia, X0 + 28, 261.8, 60, 8.2);
  rot("TEL. CONTATO:", 106, 261.8, false);
  valor(d.telContato, 126, 261.8, 60, 8.2);

  caixa(X0, 265, X1 - X0, 10);
  rot("CUIDADOR", X0 + 4, 268);
  let xcv = X0 + 2;
  for (const v of VINCULOS_CUIDADOR) {
    const w = circulo(xcv, 272, d.cuidador === v, v, 5.6) + 1.6;
    xcv += w;
  }
  rot("CNS DO CUIDADOR", 150, 268, false);
  celulas(d.cnsCuidador, 15, 150, 270, 3.4, 3.6);

  // ------------------------------------------------------------ legenda
  fonte(5.8);
  doc.text(
    [
      "Legenda: [ ] Opção múltipla de escolha   ( ) Opção única de escolha (marcar X na opção desejada)",
      "Modalidade de AD: destinada a usuários com dificuldade ou impossibilidade física de locomoção até uma unidade de saúde. AD 1: usuários que necessitam de cuidados de menor intensidade,",
      "devendo ser acompanhados regularmente pela equipe de atenção básica. AD 2: usuários que necessitam de cuidado intensivo, com visitas, no mínimo, semanais. AD 3: usuários com os critérios",
      "de AD2 com agregação de procedimento(s) de maior complexidade (por exemplo, ventilação mecânica e paracentese).",
      "*Campo obrigatório   **Campo obrigatório para cadastro de cidadãos admitidos na própria Emad   ***Condicionado à resposta anterior",
    ].map(limpar),
    X0, 278.5, { lineHeightFactor: 1.3 },
  );
  fonte(6, "normal", CINZA);
  t("AEA/e-SUS AB v.2.1", X1, 295, { align: "right" });
  t("1/1", 105, 295, { align: "center" });

  return { doc, nomeArquivo: `elegibilidade-admissao-${slug(d.nome) || "paciente"}-${d.data}.pdf` };
}

export async function gerarElegibilidadePdf(d: DadosElegibilidade): Promise<void> {
  const { doc, nomeArquivo } = await montarElegibilidadePdf(d);
  doc.save(nomeArquivo);
}
