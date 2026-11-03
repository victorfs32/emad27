// Evolução clínica em PDF (A4 retrato): uma evolução ou o histórico do paciente.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import { TITULO_CATEGORIA, dataHoraBR, sinaisVitais, type EvolucaoClinica } from "./evolucao-regras";
import { desenharLogo, PROPORCAO_LOGO } from "./logo";

export type PacientePdf = { nome: string; prontuario: string; cns: string; nascimento: string; idade: string; sexo: string; diagnostico: string };

type Cor = [number, number, number];
const TINTA: Cor = [20, 20, 20];
const APAGADO: Cor = [90, 100, 100];
const VERDE: Cor = [29, 111, 87];

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/₂/g, "2").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function montarEvolucoesPdf(p: PacientePdf, evolucoes: EvolucaoClinica[], geradoEm: string): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const uma = evolucoes.length === 1;
  doc.setProperties({
    title: `${uma ? TITULO_CATEGORIA[evolucoes[0].categoria] : "Histórico de evoluções"} — ${p.nome}`,
    author: "EMAD 27", subject: "Evolução clínica", creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const X0 = 15, X1 = 195, LARG = X1 - X0, FUNDO = 278;
  const fonte = (tam: number, estilo: "normal" | "bold" = "normal", cor: Cor = TINTA) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(cor[0], cor[1], cor[2]);
  };
  let y = 0;

  /** Cabeçalho com logotipo, título e identificação do paciente (repetido em cada página). */
  const cabecalho = () => {
    const larguraLogo = 36;
    desenharLogo(doc, X0, 10, larguraLogo);
    fonte(14, "bold");
    doc.text(uma ? TITULO_CATEGORIA[evolucoes[0].categoria].toUpperCase() : "HISTÓRICO DE EVOLUÇÕES", X1, 17, { align: "right" });
    fonte(9.5, "normal", [70, 85, 85]);
    doc.text("EMAD 27 — Programa Melhor em Casa", X1, 22.5, { align: "right" });
    y = 10 + larguraLogo * PROPORCAO_LOGO + 4;

    doc.setDrawColor(190, 200, 200);
    doc.setFillColor(244, 248, 247);
    doc.setLineWidth(0.25);
    const linhas = [
      [["Paciente", p.nome], ["Prontuário", p.prontuario]],
      [["CNS", p.cns || "—"], ["Nascimento", [p.nascimento, p.idade].filter(Boolean).join(" · ") || "—"], ["Sexo", p.sexo || "—"]],
      [["Diagnóstico", p.diagnostico || "—"]],
    ];
    const h = 6 + linhas.length * 5.6;
    doc.roundedRect(X0, y, LARG, h, 1.5, 1.5, "FD");
    linhas.forEach((campos, i) => {
      const larg = LARG / campos.length;
      campos.forEach(([r, v], j) => {
        const x = X0 + 3 + j * larg;
        fonte(8, "bold", APAGADO);
        doc.text(`${r}:`, x, y + 6 + i * 5.6);
        const w = doc.getTextWidth(`${r}: `);
        fonte(9, j === 0 && i === 0 ? "bold" : "normal");
        doc.text(limpar(doc.splitTextToSize(v, larg - w - 6)[0] ?? ""), x + w, y + 6 + i * 5.6);
      });
    });
    y += h + 6;
  };
  const garantir = (altura: number) => {
    if (y + altura > FUNDO) {
      doc.addPage();
      cabecalho();
    }
  };
  /** Parágrafo com quebra de linha e de página. */
  const paragrafo = (texto: string, tam = 10) => {
    fonte(tam);
    const linhas = doc.splitTextToSize(limpar(texto), LARG - 4) as string[];
    const passo = tam * 0.3528 * 1.4;
    for (const l of linhas) {
      garantir(passo + 1);
      doc.text(l, X0 + 2, y);
      y += passo;
    }
  };

  cabecalho();
  if (!evolucoes.length) {
    fonte(11, "normal", APAGADO);
    doc.text("Nenhuma evolução registrada.", X0, y + 4);
  }

  // Da mais antiga para a mais recente, como um prontuário.
  [...evolucoes].reverse().forEach((e) => {
    garantir(40);
    // faixa com tipo, data e hora
    doc.setFillColor(...VERDE);
    doc.rect(X0, y, LARG, 7.5, "F");
    fonte(10.5, "bold", [255, 255, 255]);
    doc.text(TITULO_CATEGORIA[e.categoria].toUpperCase(), X0 + 3, y + 5.2);
    doc.text(dataHoraBR(e.dataHora), X1 - 3, y + 5.2, { align: "right" });
    y += 12;

    const sv = sinaisVitais(e);
    if (sv.length) {
      fonte(8.5, "bold", APAGADO);
      doc.text("SINAIS VITAIS", X0 + 2, y);
      y += 4.6;
      fonte(9.5);
      doc.text(limpar(sv.map(([r, v]) => `${r}: ${v}`).join("    ")), X0 + 2, y);
      y += 6.5;
    }

    garantir(12);
    fonte(8.5, "bold", APAGADO);
    doc.text("EVOLUÇÃO", X0 + 2, y);
    y += 4.8;
    paragrafo(e.evolucao);
    y += 2.5;

    if (e.conduta) {
      garantir(12);
      fonte(8.5, "bold", APAGADO);
      doc.text("CONDUTA / PLANO", X0 + 2, y);
      y += 4.8;
      paragrafo(e.conduta);
      y += 2.5;
    }

    // identificação de quem registrou (registro eletrônico)
    garantir(16);
    doc.setDrawColor(190, 200, 200);
    doc.line(X1 - 85, y + 1, X1, y + 1);
    fonte(9, "bold");
    doc.text(limpar(e.autor), X1 - 42.5, y + 5.5, { align: "center" });
    fonte(8.5);
    const ident = [e.autorCargo?.toUpperCase(), e.autorRegistro?.toUpperCase()].filter(Boolean).join(" · ");
    if (ident) doc.text(limpar(ident), X1 - 42.5, y + 9.5, { align: "center" });
    fonte(7.5, "normal", APAGADO);
    doc.text(limpar(`Registrado eletronicamente no sistema EMAD 27 em ${dataHoraBR(e.dataHora)}`), X0 + 2, y + 9.5);
    y += 17;
  });

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    fonte(8, "normal", [110, 120, 120]);
    doc.text(limpar(`EMAD 27 — Programa Melhor em Casa · ${p.nome} · gerado em ${geradoEm}`), 105, 289, { align: "center" });
    if (paginas > 1) doc.text(`${i}/${paginas}`, X1, 289, { align: "right" });
  }

  const nome = slug(p.nome) || "paciente";
  return {
    doc,
    nomeArquivo: uma ? `evolucao-${nome}-${evolucoes[0].dataHora.slice(0, 10)}.pdf` : `evolucoes-${nome}.pdf`,
  };
}

export async function baixarEvolucoesPdf(p: PacientePdf, evolucoes: EvolucaoClinica[]): Promise<void> {
  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short" });
  const { doc, nomeArquivo } = await montarEvolucoesPdf(p, evolucoes, geradoEm);
  doc.save(nomeArquivo);
}
