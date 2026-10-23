// Relatório do paciente em PDF. Roda no navegador (a biblioteca é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import type { Ficha } from "./pacientes";
import {
  CONTINENCIA, DE_QUEM, DIURESE, FISIO, SITUACOES, TIPOS_DISPOSITIVO, VIAS_DIETA,
  calcularIdade, formatarData, rotulo, simNao, situacaoTroca, valorOuNI,
} from "./opcoes";
import { formatarCep, formatarCns, formatarCpf, formatarTelefone } from "./validacao";

type RegistroEvolucao = { data: string; tipo: string; texto: string; autor: string };
type RegistroProcedimento = { data: string; tipo: string; obs: string | null; autor: string };

export type DadosRelatorio = {
  geradoEm: string;
  geradoPor: string;
  hoje: string;
  ficha: Ficha;
  evolucoes: RegistroEvolucao[];
  totalEvolucoes: number;
  procedimentos: RegistroProcedimento[];
  procedimentosPorTipo: Record<string, number>;
  procedimentosMes: number;
  visitasMes: number;
  visitasTotal: number;
  ultimaVisita: string | null;
};

type Cor = [number, number, number];
const COR = {
  verde: [29, 111, 87] as Cor,
  verdeEscuro: [14, 76, 60] as Cor,
  suave: [226, 236, 229] as Cor,
  fundo: [246, 249, 246] as Cor,
  texto: [20, 35, 29] as Cor,
  muted: [93, 110, 101] as Cor,
  borda: [213, 224, 215] as Cor,
  branco: [255, 255, 255] as Cor,
  vermelho: [198, 40, 40] as Cor,
  vermelhoSuave: [255, 233, 238] as Cor,
  ambar: [138, 74, 0] as Cor,
  ambarSuave: [255, 238, 205] as Cor,
  azul: [12, 60, 120] as Cor,
  azulSuave: [222, 235, 255] as Cor,
  amarelo: [255, 247, 204] as Cor,
};

const STATUS_COR: Record<string, { fundo: Cor; texto: Cor }> = {
  ativo: { fundo: [211, 243, 222], texto: [15, 107, 55] },
  internado: { fundo: [255, 228, 194], texto: [138, 74, 0] },
  alta: { fundo: [217, 231, 255], texto: [12, 60, 120] },
  transferido: { fundo: [233, 239, 233], texto: [93, 110, 101] },
  obito: { fundo: [255, 220, 234], texto: [140, 29, 73] },
};

/** A fonte padrão do PDF não tem alguns símbolos; troca por equivalentes. */
const limpar = (t: string) =>
  t.replace(/₂/g, "2").replace(/→/g, "›").replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”›]/g, "");

const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const junta = (itens: string[]) =>
  itens.length <= 1 ? (itens[0] ?? "") : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;

const dias = (de: string, ate: string) => Math.floor((Date.parse(ate) - Date.parse(de)) / 86400000);

// ---------------------------------------------------------------- textos explicativos
function paragrafosResumo(d: DadosRelatorio): string[] {
  const f = d.ficha;
  const idade = calcularIdade(f.data_nascimento);
  const sit = f.situacao;
  const p: string[] = [];

  let abre = `Paciente${idade !== null ? ` com ${idade} anos` : ""}`;
  const sep = idade !== null ? ", " : " ";
  const quando = f.situacao_data ? ` em ${formatarData(f.situacao_data)}` : "";
  if (sit === "ativo") abre += `${sep}em acompanhamento ativo pela EMAD 27 desde ${formatarData(f.admissao)}`;
  else if (sit === "internado") abre += `${sep}atualmente em internação temporária (acompanhado pela EMAD 27 desde ${formatarData(f.admissao)})`;
  else if (sit === "alta") abre += `${sep}que teve alta do acompanhamento da EMAD 27${quando}`;
  else if (sit === "transferido") abre += `${sep}com transferência registrada${quando}`;
  else abre += `${sep}com óbito registrado${quando}`;
  if (f.modalidade) abre += `, na modalidade ${f.modalidade}`;
  if (f.uaps?.nome) abre += `. Unidade de saúde de referência: ${f.uaps.nome}`;
  p.push(abre + ".");

  const principal = f.diagnosticos.find((x) => x.principal) ?? f.diagnosticos[0];
  if (principal) {
    const outros = f.diagnosticos.filter((x) => x !== principal).map((x) => x.cid);
    p.push(
      `Diagnóstico principal: ${principal.cid}${principal.descricao ? ` (${principal.descricao})` : ""}.` +
        (outros.length ? ` Outros diagnósticos registrados: ${junta(outros)}.` : ""),
    );
  } else {
    p.push("Ainda não há diagnóstico (CID) registrado no cadastro.");
  }

  const usa: string[] = [];
  if (f.tqt) usa.push("traqueostomia (respira por uma cânula no pescoço)");
  if (f.o2) usa.push(`oxigênio${f.o2_fluxo !== null ? ` (${f.o2_fluxo} litros por minuto)` : ""}`);
  if (f.colostomia) usa.push("colostomia (bolsa coletora de fezes)");
  if (f.lpp) usa.push("lesão por pressão");
  const sondas = f.dieta_vias.filter((v) => v !== "oral" && v !== "outra").map((v) => rotulo(VIAS_DIETA, v)?.toLowerCase() ?? v);
  if (sondas.length) usa.push(`alimentação por ${junta(sondas)}`);
  if (f.diurese === "svd" || f.diurese === "cistostomia") usa.push(`urina por ${rotulo(DIURESE, f.diurese)?.toLowerCase()}`);
  if (f.usa_cama_pmec) usa.push("cama do PMEC");
  if (usa.length) p.push(`Cuidados e recursos em uso: ${junta(usa)}.`);

  const visitas =
    d.visitasMes > 0
      ? `Neste mês foram registradas ${d.visitasMes} ${d.visitasMes === 1 ? "visita domiciliar" : "visitas domiciliares"}`
      : "Não há visita domiciliar registrada neste mês";
  const ult = d.ultimaVisita ? `; a última foi em ${formatarData(d.ultimaVisita)}` : "";
  const prox = f.proxima_visita ? ` A próxima visita está prevista para ${formatarData(f.proxima_visita)}.` : "";
  p.push(`${visitas}${ult}.${prox}`);
  return p;
}

type Atencao = { nivel: "alto" | "medio" | "info"; texto: string };

function pontosDeAtencao(d: DadosRelatorio): Atencao[] {
  const f = d.ficha;
  const a: Atencao[] = [];
  for (const x of f.dispositivos) {
    const s = situacaoTroca(x.proxima_troca, d.hoje);
    const nome = TIPOS_DISPOSITIVO.find((t) => t.valor === x.tipo)?.sigla ?? x.tipo;
    if (s === "vencida") a.push({ nivel: "alto", texto: `Troca de ${nome} vencida: estava prevista para ${formatarData(x.proxima_troca)}.` });
    else if (s === "proxima") a.push({ nivel: "medio", texto: `Troca de ${nome} prevista para ${formatarData(x.proxima_troca)} (nos próximos 30 dias).` });
  }
  if (f.tqt && f.tqt_ultima_troca && dias(f.tqt_ultima_troca, d.hoje) > 30)
    a.push({ nivel: "medio", texto: `Cânula de traqueostomia trocada pela última vez há ${dias(f.tqt_ultima_troca, d.hoje)} dias (${formatarData(f.tqt_ultima_troca)}).` });
  for (const l of f.lesoes_pressao) {
    if (!l.data_avaliacao) a.push({ nivel: "medio", texto: `Lesão por pressão (${l.localizacao}) sem data de avaliação registrada.` });
    else if (dias(l.data_avaliacao, d.hoje) > 14)
      a.push({ nivel: "medio", texto: `Lesão por pressão (${l.localizacao}) avaliada há ${dias(l.data_avaliacao, d.hoje)} dias; vale reavaliar.` });
  }
  if (f.situacao === "ativo") {
    if (f.proxima_visita && f.proxima_visita < d.hoje) a.push({ nivel: "alto", texto: `Visita agendada para ${formatarData(f.proxima_visita)} está atrasada.` });
    if (!f.proxima_visita) a.push({ nivel: "info", texto: "Nenhuma próxima visita agendada." });
  }
  const pendentes: string[] = [];
  if (f.tqt === null) pendentes.push("traqueostomia");
  if (f.lpp === null) pendentes.push("lesão por pressão");
  if (f.o2 === null) pendentes.push("oxigênio");
  if (f.colostomia === null) pendentes.push("colostomia");
  if (f.usa_cama_pmec === null) pendentes.push("cama do PMEC");
  if (f.diagnosticos.length === 0) pendentes.push("diagnóstico (CID)");
  if (f.cuidadores.length === 0) pendentes.push("cuidador");
  if (f.telefones.length === 0) pendentes.push("telefone");
  if (!f.cpf) pendentes.push("CPF");
  if (!f.cns) pendentes.push("CNS");
  if (pendentes.length) a.push({ nivel: "info", texto: `Informações ainda não preenchidas no cadastro: ${junta(pendentes)}.` });
  return a;
}

const GLOSSARIO: [string, string][] = [
  ["EMAD", "Equipe Multiprofissional de Atenção Domiciliar: equipe de saúde que acompanha o paciente em casa (Programa Melhor em Casa)."],
  ["UAPS", "Unidade de Atenção Primária à Saúde: o posto de saúde de referência do paciente."],
  ["AD1, AD2, AD3", "Modalidades da atenção domiciliar, da menor para a maior complexidade do cuidado. Quanto maior, mais frequentes as visitas e mais cuidados especiais."],
  ["CID", "Classificação Internacional de Doenças: código que identifica o diagnóstico (ex.: I64 = AVC)."],
  ["TQT", "Traqueostomia: abertura na traqueia, no pescoço, com uma cânula para respirar."],
  ["LPP", "Lesão por pressão (popularmente, escara): ferida na pele causada por pressão prolongada."],
  ["GTT", "Gastrostomia: sonda colocada direto no estômago, pela barriga, para alimentar e dar medicamentos."],
  ["SNG / SNE", "Sonda nasogástrica / nasoenteral: sonda que vai do nariz ao estômago / ao intestino, para alimentar e dar medicamentos."],
  ["SVD", "Sonda vesical de demora: sonda na bexiga que drena a urina."],
  ["Cistostomia", "Abertura na bexiga, pela barriga, para a urina sair."],
  ["Colostomia", "Abertura do intestino na barriga para saída das fezes, em uma bolsa coletora."],
  ["EV", "Endovenoso: medicação ou procedimento feito pela veia."],
  ["O2", "Oxigênio (oxigenoterapia). O fluxo é medido em litros por minuto (L/min)."],
  ["Fisio motora / respiratória", "Fisioterapia para o movimento e a força dos músculos / para ajudar a respiração."],
  ["Troca e próxima troca", "Data da última troca de um dispositivo e a prevista para a próxima. Em vermelho: troca vencida. Em laranja: vence em até 30 dias."],
  ["Não informado x Não", "“Não informado” significa que o dado ainda não foi preenchido. “Não” significa que a equipe confirmou que não se aplica."],
];

// ---------------------------------------------------------------- gerador
export async function montarRelatorioPdf(d: DadosRelatorio): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const [{ jsPDF }, tabela] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = tabela.default;
  const f = d.ficha;
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: `Relatório do paciente — ${f.nome}`, author: "EMAD 27", subject: "Relatório do paciente", creator: "EMAD 27 — Programa Melhor em Casa" });

  const L = 14, R = 196, LARG = R - L, TOPO = 20, FUNDO = 279;
  let y = 0;

  const fill = (c: Cor) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: Cor) => doc.setDrawColor(c[0], c[1], c[2]);
  const ink = (c: Cor) => doc.setTextColor(c[0], c[1], c[2]);
  const fonte = (tam: number, estilo: "normal" | "bold" | "italic" = "normal") => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
  };
  const alt = (tam: number) => tam * 0.3528 * 1.38; // altura da linha em mm
  const novaPagina = () => {
    doc.addPage();
    y = TOPO;
  };
  const cabe = (h: number) => {
    if (y + h > FUNDO) novaPagina();
  };

  /** Escreve um parágrafo com quebra de linha; devolve a altura usada. Não quebra página no meio. */
  const paragrafo = (t: string, x: number, larg: number, tam: number, estilo: "normal" | "bold" | "italic", cor: Cor, desenhar = true) => {
    fonte(tam, estilo);
    const linhas = doc.splitTextToSize(limpar(t), larg) as string[];
    const h = linhas.length * alt(tam);
    if (desenhar) {
      ink(cor);
      doc.text(linhas, x, y + tam * 0.3528 * 0.85, { baseline: "alphabetic" });
    }
    return h;
  };

  const secao = (titulo: string, explicacao?: string) => {
    cabe(explicacao ? 24 : 16);
    y += 4;
    fill(COR.verde);
    doc.roundedRect(L, y, 1.8, 6.4, 0.9, 0.9, "F");
    fonte(12.5, "bold");
    ink(COR.texto);
    doc.text(limpar(titulo), L + 4.5, y + 4.9);
    stroke(COR.borda);
    doc.setLineWidth(0.25);
    doc.line(L, y + 8.4, R, y + 8.4);
    y += 11;
    if (explicacao) {
      const h = paragrafo(explicacao, L, LARG, 8.6, "italic", COR.muted);
      y += h + 2.5;
    }
  };

  const subtitulo = (t: string) => {
    cabe(9);
    fonte(9, "bold");
    ink(COR.verde);
    doc.text(limpar(t), L, y + 3);
    y += 6;
  };

  /** Pares "rótulo / valor" em duas colunas. */
  const grade = (pares: ([string, string] | [string, string, "largo"])[]) => {
    const col = (LARG - 6) / 2;
    let i = 0;
    while (i < pares.length) {
      const a = pares[i];
      const largo = a[2] === "largo";
      const b = !largo ? pares[i + 1] : undefined;
      const bLargo = b?.[2] === "largo";
      const usaB = b && !bLargo;
      const larguraA = largo ? LARG : col;
      const hA = paragrafo(a[1], 0, larguraA, 9.5, "normal", COR.texto, false);
      const hB = usaB ? paragrafo(b[1], 0, col, 9.5, "normal", COR.texto, false) : 0;
      const h = 4 + Math.max(hA, hB) + 2.6;
      cabe(h);
      const desenha = (par: [string, string] | [string, string, "largo"], x: number, w: number) => {
        fonte(6.8, "bold");
        ink(COR.muted);
        doc.text(limpar(par[0].toUpperCase()), x, y + 2.6, { charSpace: 0.25 });
        y += 4;
        const ni = par[1] === "Não informado";
        paragrafo(par[1], x, w, 9.5, "normal", ni ? COR.muted : COR.texto);
        y -= 4;
      };
      desenha(a, L, larguraA);
      if (usaB) desenha(b, L + col + 6, col);
      y += h;
      i += usaB ? 2 : 1;
    }
  };

  const pilula = (t: string, x: number, yy: number, fundo: Cor, texto: Cor) => {
    fonte(7.4, "bold");
    const w = doc.getTextWidth(limpar(t)) + 5.2;
    fill(fundo);
    doc.roundedRect(x, yy, w, 5.2, 2.6, 2.6, "F");
    ink(texto);
    doc.text(limpar(t), x + 2.6, yy + 3.6);
    return w;
  };

  const tabelaPadrao = (cabecalho: string[], linhas: string[][], opcoes: Record<string, unknown> = {}) => {
    cabe(18);
    autoTable(doc, {
      startY: y,
      head: [cabecalho.map(limpar)],
      body: linhas.map((l) => l.map(limpar)),
      margin: { left: L, right: 210 - R, top: TOPO, bottom: 20 },
      theme: "plain",
      styles: { font: "helvetica", fontSize: 8.6, cellPadding: { top: 2.2, bottom: 2.2, left: 2.6, right: 2.6 }, textColor: COR.texto, lineColor: COR.borda, lineWidth: 0.15, valign: "top" },
      rowPageBreak: "avoid",
      headStyles: { fillColor: COR.verde, textColor: COR.branco, fontStyle: "bold", fontSize: 7.8, valign: "middle" },
      alternateRowStyles: { fillColor: COR.fundo },
      ...opcoes,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  };

  // ------------------------------------------------------------ capa
  fill(COR.verdeEscuro);
  doc.rect(0, 0, 210, 46, "F");
  fill(COR.verde);
  doc.rect(0, 0, 210, 46, "F");
  // círculos decorativos translucidos
  const GState = (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState;
  doc.setGState(new GState({ opacity: 0.1 }) as never);
  fill(COR.branco);
  doc.circle(196, 6, 34, "F");
  doc.circle(168, 40, 20, "F");
  doc.setGState(new GState({ opacity: 1 }) as never);

  // logo (cruz)
  fill(COR.branco);
  doc.roundedRect(L, 11, 12, 12, 3, 3, "F");
  fill(COR.verde);
  doc.roundedRect(L + 5.1, 14, 1.8, 6, 0.9, 0.9, "F");
  doc.roundedRect(L + 3, 16.1, 6, 1.8, 0.9, 0.9, "F");
  ink(COR.branco);
  fonte(8, "bold");
  doc.text("EMAD 27", L + 16, 15.4);
  fonte(6.8, "normal");
  doc.text("PROGRAMA MELHOR EM CASA", L + 16, 19.6, { charSpace: 0.35 });
  fonte(22, "bold");
  doc.text("Relatório do paciente", L, 36);
  fonte(8.2, "normal");
  doc.text(limpar(`Emitido em ${d.geradoEm}`), R, 15.4, { align: "right" });
  doc.text(limpar(`por ${d.geradoPor}`), R, 19.6, { align: "right" });

  // cartão do paciente
  const topoCartao = 52;
  fonte(16.5, "bold");
  const nomeLinhas = (doc.splitTextToSize(limpar(f.nome), LARG - 70) as string[]).slice(0, 2);
  const duasLinhas = nomeLinhas.length > 1;
  const hCartao = duasLinhas ? 38 : 31;
  fill([228, 236, 230]);
  doc.roundedRect(L + 0.6, topoCartao + 0.8, LARG, hCartao, 3.5, 3.5, "F");
  fill(COR.branco);
  stroke(COR.borda);
  doc.setLineWidth(0.3);
  doc.roundedRect(L, topoCartao, LARG, hCartao, 3.5, 3.5, "FD");
  fonte(16.5, "bold");
  ink(COR.texto);
  doc.text(nomeLinhas, L + 6, topoCartao + 9.2);
  const idade = calcularIdade(f.data_nascimento);
  fonte(9, "normal");
  ink(COR.muted);
  const sub = [`Prontuário ${f.prontuario}`, idade !== null ? `${idade} anos` : null, f.modalidade, f.uaps?.nome].filter(Boolean).join("  ·  ");
  doc.text(limpar(sub), L + 6, topoCartao + 9.2 + (duasLinhas ? 6.7 + 6.2 : 6.6));
  // pílulas
  let px = L + 6;
  const py = topoCartao + hCartao - 8.8;
  const st = STATUS_COR[f.situacao] ?? STATUS_COR.ativo;
  px += pilula(rotulo(SITUACOES, f.situacao) ?? f.situacao, px, py, st.fundo, st.texto) + 2;
  for (const [ativo, nome] of [[f.lpp, "LPP"], [f.tqt, "TQT"], [f.o2, "O2"], [f.colostomia, "Colostomia"]] as [boolean | null, string][])
    if (ativo) px += pilula(nome, px, py, COR.suave, COR.verdeEscuro) + 2;
  // destaque do prontuário
  fill(COR.suave);
  doc.roundedRect(R - 52, topoCartao + (hCartao - 21) / 2, 46, 21, 3, 3, "F");
  fonte(6.8, "bold");
  ink(COR.muted);
  doc.text("PRONTUÁRIO", R - 29, topoCartao + (hCartao - 21) / 2 + 6.4, { align: "center", charSpace: 0.4 });
  fonte(17, "bold");
  ink(COR.verdeEscuro);
  doc.text(limpar(f.prontuario), R - 29, topoCartao + (hCartao - 21) / 2 + 15.6, { align: "center" });
  y = topoCartao + hCartao + 6;

  // ------------------------------------------------------------ resumo
  secao("Resumo em palavras simples", "Um texto curto, montado automaticamente com o que está registrado no cadastro.");
  {
    const paragrafos = paragrafosResumo(d);
    fonte(9.6, "normal");
    const alturas = paragrafos.map((p) => paragrafo(p, 0, LARG - 12, 9.6, "normal", COR.texto, false));
    const total = alturas.reduce((s, h) => s + h, 0) + (paragrafos.length - 1) * 2.4 + 9;
    cabe(total);
    fill(COR.suave);
    doc.roundedRect(L, y, LARG, total, 3, 3, "F");
    fill(COR.verde);
    doc.roundedRect(L, y, 1.8, total, 0.9, 0.9, "F");
    let yy = y + 4.5;
    paragrafos.forEach((p, i) => {
      const guarda = y;
      y = yy;
      paragrafo(p, L + 7, LARG - 12, 9.6, "normal", COR.texto);
      y = guarda;
      yy += alturas[i] + 2.4;
    });
    y += total + 3;
  }

  // ------------------------------------------------------------ pontos de atenção
  const atencao = pontosDeAtencao(d);
  if (atencao.length) {
    secao("Pontos de atenção", "O que merece olhar da equipe agora (vermelho: urgente; laranja: em breve; azul: informação).");
    for (const a of atencao) {
      const cores = a.nivel === "alto" ? { f: COR.vermelhoSuave, c: COR.vermelho } : a.nivel === "medio" ? { f: COR.ambarSuave, c: COR.ambar } : { f: COR.azulSuave, c: COR.azul };
      const h = paragrafo(a.texto, 0, LARG - 12, 9, "normal", COR.texto, false) + 5;
      cabe(h + 2);
      fill(cores.f);
      doc.roundedRect(L, y, LARG, h, 2, 2, "F");
      fill(cores.c);
      doc.roundedRect(L, y, 1.6, h, 0.8, 0.8, "F");
      const guarda = y;
      y += 2.5;
      paragrafo(a.texto, L + 6, LARG - 12, 9, "normal", COR.texto);
      y = guarda + h + 2;
    }
  }

  // ------------------------------------------------------------ identificação
  secao("Identificação", "Dados que identificam o paciente e o acompanhamento na EMAD 27.");
  grade([
    ["Paciente", f.nome, "largo"],
    ["Prontuário", f.prontuario],
    ["UAPS de referência", valorOuNI(f.uaps?.nome)],
    ["Data de nascimento", f.data_nascimento ? formatarData(f.data_nascimento) : "Não informado"],
    ["Idade", idade === null ? "Não informado" : `${idade} anos`],
    ["Sexo", f.sexo === "F" ? "Feminino" : f.sexo === "M" ? "Masculino" : "Não informado"],
    ["Admissão na EMAD", formatarData(f.admissao)],
    ["Modalidade", valorOuNI(f.modalidade)],
    ["CPF", f.cpf ? formatarCpf(f.cpf) : "Não informado"],
    ["Cartão SUS (CNS)", f.cns ? formatarCns(f.cns) : "Não informado"],
    ["RG", valorOuNI(f.rg)],
    ["Situação atual", rotulo(SITUACOES, f.situacao) ?? f.situacao],
    ["Nome da mãe", valorOuNI(f.nome_mae)],
    ["Nome do pai", valorOuNI(f.nome_pai)],
  ]);
  if (f.situacao !== "ativo" && (f.situacao_data || f.situacao_motivo || f.situacao_obs)) {
    y += 1;
    grade([
      ["Data da mudança de situação", f.situacao_data ? formatarData(f.situacao_data) : "Não informado"],
      ["Motivo", valorOuNI(f.situacao_motivo)],
      ["Observações", valorOuNI(f.situacao_obs), "largo"],
    ]);
  }

  // ------------------------------------------------------------ contatos
  secao("Contatos e endereço", "Como falar com o paciente e a família, e onde fica a casa (útil para organizar as visitas).");
  if (f.telefones.length) {
    tabelaPadrao(
      ["Telefone", "De quem", "WhatsApp"],
      f.telefones.map((t) => [formatarTelefone(t.numero), rotulo(DE_QUEM, t.de_quem) ?? t.de_quem, simNao(t.whatsapp)]),
    );
  } else {
    grade([["Telefones", "Não informado", "largo"]]);
  }
  grade([
    ["Rua", valorOuNI(f.rua)],
    ["Número", valorOuNI(f.numero)],
    ["Complemento", valorOuNI(f.complemento)],
    ["Bairro", valorOuNI(f.bairro)],
    ["Município", valorOuNI(f.municipio)],
    ["CEP", f.cep ? formatarCep(f.cep) : "Não informado"],
    ["Ponto de referência", valorOuNI(f.referencia), "largo"],
  ]);

  // ------------------------------------------------------------ cuidadores
  secao("Cuidadores", "Pessoas que cuidam do paciente no dia a dia. O cuidador principal é o contato preferencial da equipe.");
  if (f.cuidadores.length) {
    tabelaPadrao(
      ["Nome", "Vínculo", "Telefone", "CPF", "CNS"],
      f.cuidadores.map((c) => [
        `${c.nome}${c.principal ? "  (principal)" : ""}`, valorOuNI(c.vinculo),
        c.telefone ? formatarTelefone(c.telefone) : "Não informado",
        c.cpf ? formatarCpf(c.cpf) : "Não informado", c.cns ? formatarCns(c.cns) : "Não informado",
      ]),
    );
  } else {
    grade([["Cuidadores", "Não informado", "largo"]]);
  }

  // ------------------------------------------------------------ clínico
  secao("Informações clínicas", "Condições de saúde e cuidados especiais que a equipe acompanha. “Não informado” = ainda não preenchido; “Não” = confirmado que não se aplica.");
  subtitulo("Diagnósticos (CID)");
  if (f.diagnosticos.length) {
    tabelaPadrao(
      ["CID", "Descrição", ""],
      f.diagnosticos.map((x) => [x.cid, x.descricao ?? "Sem descrição", x.principal ? "Principal" : ""]),
      { columnStyles: { 0: { cellWidth: 20, fontStyle: "bold" }, 2: { cellWidth: 26 } } },
    );
  } else {
    grade([["Diagnósticos", "Não informado", "largo"]]);
  }

  subtitulo("Cuidados e hábitos");
  const vias = f.dieta_vias.length ? f.dieta_vias.map((v) => rotulo(VIAS_DIETA, v) ?? v).join(", ") : "Não informado";
  grade([
    ["Fisioterapia", f.fisio ? (rotulo(FISIO, f.fisio) ?? f.fisio) : "Não informado"],
    ["Frequência da fisioterapia", f.fisio === "sim" ? valorOuNI(f.fisio_frequencia) : "—"],
    ["Via de alimentação (dieta)", vias, "largo"],
    ...(f.dieta_obs ? ([["Observações da dieta", f.dieta_obs, "largo"]] as [string, string, "largo"][]) : []),
    ["Diurese (urina)", f.diurese ? (rotulo(DIURESE, f.diurese) ?? f.diurese) : "Não informado"],
    ["Uso de fralda", simNao(f.usa_fralda)],
    ["Continência", f.continencia ? (rotulo(CONTINENCIA, f.continencia) ?? f.continencia) : "Não informado"],
    ["Usa cama do PMEC", simNao(f.usa_cama_pmec)],
  ]);

  subtitulo("Dispositivos e condições especiais");
  grade([
    ["Traqueostomia (TQT)", simNao(f.tqt)],
    ["Oxigênio (O2)", simNao(f.o2)],
    ["Colostomia", simNao(f.colostomia)],
    ["Lesão por pressão (LPP)", simNao(f.lpp)],
  ]);
  if (f.tqt) subtitulo("Traqueostomia: detalhes");
  if (f.tqt)
    grade([
      ["Tipo de cânula", valorOuNI(f.tqt_canula_tipo)],
      ["Calibre", valorOuNI(f.tqt_calibre)],
      ["Última troca da cânula", f.tqt_ultima_troca ? formatarData(f.tqt_ultima_troca) : "Não informado"],
      ["Observações da traqueostomia", valorOuNI(f.tqt_obs)],
    ]);
  if (f.o2) subtitulo("Oxigênio: detalhes");
  if (f.o2)
    grade([
      ["Dispositivo de oxigênio", valorOuNI(f.o2_dispositivo)],
      ["Fluxo prescrito", f.o2_fluxo === null ? "Não informado" : `${f.o2_fluxo} L/min`],
      ["Regime de uso", valorOuNI(f.o2_regime)],
      ["Observações do oxigênio", valorOuNI(f.o2_obs)],
    ]);
  if (f.lpp) {
    subtitulo("Lesões por pressão");
    if (f.lesoes_pressao.length)
      tabelaPadrao(
        ["Localização da lesão", "Classificação", "Cobertura utilizada", "Última avaliação"],
        f.lesoes_pressao.map((l) => [l.localizacao, valorOuNI(l.classificacao), valorOuNI(l.cobertura), l.data_avaliacao ? formatarData(l.data_avaliacao) : "Não informada"]),
      );
    else grade([["Lesões", "Paciente com LPP, mas nenhuma lesão detalhada no cadastro.", "largo"]]);
  }
  if (f.observacoes) grade([["Observações gerais", f.observacoes, "largo"]]);

  // ------------------------------------------------------------ dispositivos / trocas
  secao("Dispositivos e trocas", "Sondas e outros dispositivos com data da última troca e da próxima. Vermelho: troca vencida. Laranja: vence em até 30 dias.");
  if (f.dispositivos.length) {
    tabelaPadrao(
      ["Dispositivo", "Número", "Confecção", "Última troca", "Próxima troca"],
      f.dispositivos.map((x) => {
        const s = situacaoTroca(x.proxima_troca, d.hoje);
        const extra = s === "vencida" ? "  (vencida)" : s === "proxima" ? "  (em breve)" : "";
        return [TIPOS_DISPOSITIVO.find((t) => t.valor === x.tipo)?.rotulo ?? x.tipo, valorOuNI(x.numero), valorOuNI(x.confeccao), x.troca ? formatarData(x.troca) : "Não informada", `${x.proxima_troca ? formatarData(x.proxima_troca) : "Sem data"}${extra}`];
      }),
      {
        didParseCell: (h: { section: string; column: { index: number }; row: { index: number }; cell: { styles: Record<string, unknown> } }) => {
          if (h.section === "body" && h.column.index === 4) {
            const s = situacaoTroca(f.dispositivos[h.row.index]?.proxima_troca, d.hoje);
            h.cell.styles.fontStyle = "bold";
            h.cell.styles.fillColor = s === "vencida" ? COR.vermelhoSuave : s === "proxima" ? COR.ambarSuave : COR.amarelo;
            h.cell.styles.textColor = s === "vencida" ? COR.vermelho : s === "proxima" ? COR.ambar : [107, 91, 0];
          }
        },
      },
    );
  } else {
    grade([["Dispositivos", "Nenhum dispositivo (GTT, SNG ou SVD) registrado.", "largo"]]);
  }

  // ------------------------------------------------------------ acompanhamento
  secao("Visitas e acompanhamento", "Registros feitos pela equipe a cada atendimento, do mais recente para o mais antigo.");
  grade([
    ["Visitas neste mês", String(d.visitasMes)],
    ["Visitas registradas no total", String(d.visitasTotal)],
    ["Última visita domiciliar", d.ultimaVisita ? formatarData(d.ultimaVisita) : "Nenhuma registrada"],
    ["Próxima visita agendada", f.proxima_visita ? formatarData(f.proxima_visita) : "Não agendada"],
  ]);
  if (d.evolucoes.length) {
    tabelaPadrao(
      ["Data", "Tipo", "Profissional", "Registro"],
      d.evolucoes.map((e) => [formatarData(e.data), e.tipo, e.autor, e.texto]),
      { columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 32 }, 2: { cellWidth: 34 } } },
    );
    if (d.totalEvolucoes > d.evolucoes.length)
      {
        fonte(8, "italic");
        ink(COR.muted);
        doc.text(limpar(`Mostrando os ${d.evolucoes.length} registros mais recentes de ${d.totalEvolucoes}. O histórico completo está na ficha do paciente.`), L, y - 2);
        y += 3;
      }
  } else {
    grade([["Registros", "Nenhum registro de acompanhamento ainda.", "largo"]]);
  }

  // ------------------------------------------------------------ procedimentos
  secao("Procedimentos realizados", "Curativos, trocas de sondas, medicações e outros procedimentos feitos pela equipe.");
  const tipos = Object.entries(d.procedimentosPorTipo).sort((a, b) => b[1] - a[1]);
  if (tipos.length) {
    grade([["Procedimentos neste mês", String(d.procedimentosMes)], ["Total registrado", String(tipos.reduce((s, [, n]) => s + n, 0))]]);
    cabe(10);
    let cx = L;
    for (const [tipo, n] of tipos) {
      const w = pilula(`${tipo}: ${n}`, cx, y, COR.suave, COR.verdeEscuro) + 2;
      cx += w;
      if (cx > R - 30) {
        cx = L;
        y += 7;
        cabe(8);
      }
    }
    y += 9;
    tabelaPadrao(
      ["Data", "Procedimento", "Profissional", "Observações"],
      d.procedimentos.map((p) => [formatarData(p.data), p.tipo, p.autor, p.obs ?? ""]),
      { columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 34 }, 2: { cellWidth: 34 } } },
    );
  } else {
    grade([["Procedimentos", "Nenhum procedimento registrado.", "largo"]]);
  }

  // ------------------------------------------------------------ admissões anteriores
  if (f.admissoes.length) {
    secao("Admissões anteriores", "Períodos anteriores de acompanhamento na EMAD 27 (preservados quando o paciente é admitido de novo).");
    tabelaPadrao(
      ["Admissão", "Saída", "Situação na saída", "Motivo"],
      f.admissoes.map((a) => [a.admissao ? formatarData(a.admissao) : "—", a.saida ? formatarData(a.saida) : "—", rotulo(SITUACOES, a.situacao_saida) ?? "—", [a.motivo, a.obs].filter(Boolean).join(" — ") || "—"]),
    );
  }

  // ------------------------------------------------------------ glossário
  secao("Como ler este relatório", "Significado das siglas e termos usados nas páginas anteriores.");
  tabelaPadrao(["Termo", "O que significa"], GLOSSARIO.map(([t, s]) => [t, s]), {
    columnStyles: { 0: { cellWidth: 40, fontStyle: "bold", textColor: COR.verdeEscuro } },
    headStyles: { fillColor: COR.verdeEscuro, textColor: COR.branco, fontStyle: "bold", fontSize: 7.8 },
  });

  // ------------------------------------------------------------ cabeçalho corrido e rodapé em todas as páginas
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    if (i > 1) {
      fonte(7.6, "normal");
      ink(COR.muted);
      doc.text(limpar(`Relatório do paciente  ·  ${f.nome}  ·  Prontuário ${f.prontuario}`), L, 11);
      fill(COR.verde);
      doc.rect(R - 14, 9.4, 14, 1.2, "F");
      stroke(COR.borda);
      doc.setLineWidth(0.2);
      doc.line(L, 13, R, 13);
    }
    stroke(COR.borda);
    doc.setLineWidth(0.2);
    doc.line(L, 284, R, 284);
    fonte(6.9, "normal");
    ink(COR.muted);
    doc.text(limpar("Documento confidencial: contém dados de saúde protegidos pela LGPD (Lei 13.709/2018). Uso restrito à equipe de saúde."), L, 288.2);
    doc.text(limpar(`EMAD 27 · Programa Melhor em Casa  ·  Gerado em ${d.geradoEm} por ${d.geradoPor}`), L, 291.8);
    fonte(7.6, "bold");
    ink(COR.verdeEscuro);
    doc.text(`Página ${i} de ${paginas}`, R, 288.2, { align: "right" });
  }

  return { doc, nomeArquivo: `relatorio-${slug(f.nome) || "paciente"}-${d.hoje}.pdf` };
}

/** Monta o relatório e baixa o arquivo PDF. */
export async function gerarRelatorioPdf(d: DadosRelatorio): Promise<void> {
  const { doc, nomeArquivo } = await montarRelatorioPdf(d);
  doc.save(nomeArquivo);
}
