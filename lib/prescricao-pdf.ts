// Formulário "Prescrição Médica" do Programa Melhor em Casa, com os dados do paciente preenchidos.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import type { Ficha } from "./pacientes";
import { formatarData } from "./opcoes";
import { formatarCep, formatarCns, formatarTelefone } from "./validacao";

export type DadosPrescricao = {
  ficha: Ficha;
  geradoEm: string;
  geradoPor: string;
  hoje: string;
};

/** Dados fixos do modelo impresso. */
const MODELO = {
  codigo: "GER.FOR.CE-0006",
  revisao: "01",
  emad: "27",
  paginas: 2,
  linhasPorPagina: 9,
  rodape: "PROGRAMA MELHOR EM CASA",
};

const limpar = (t: string) =>
  t.replace(/₂/g, "2").replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");

const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type Cor = [number, number, number];
const PRETO: Cor = [20, 20, 20];
const CINZA: Cor = [110, 110, 110];
const AZUL: Cor = [18, 70, 140];
const VERDE: Cor = [0, 150, 70];

function textoDiagnostico(f: Ficha) {
  const ordenados = [...f.diagnosticos].sort((a, b) => Number(b.principal) - Number(a.principal));
  return ordenados.map((d) => (d.descricao ? `${d.cid} - ${d.descricao}` : d.cid)).join("  |  ");
}

function textoTelefone(f: Ficha) {
  return f.telefones.slice(0, 2).map((t) => formatarTelefone(t.numero)).join("  /  ");
}

function textoEndereco(f: Ficha) {
  const via = [f.rua, f.numero ? `nº ${f.numero}` : "", f.complemento].filter(Boolean).join(", ");
  const local = [f.bairro, f.municipio].filter(Boolean).join(" - ");
  const partes = [[via, local].filter(Boolean).join(", "), f.cep ? `CEP ${formatarCep(f.cep)}` : "", f.referencia ? `(Ref.: ${f.referencia})` : ""];
  return partes.filter(Boolean).join("  ");
}

export async function montarPrescricaoPdf(d: DadosPrescricao): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const f = d.ficha;
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape", compress: true });
  doc.setProperties({
    title: `Prescrição médica — ${f.nome}`,
    author: "EMAD 27",
    subject: "Formulário de prescrição médica",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const X0 = 10, X1 = 287, LARG = X1 - X0;
  const ink = (c: Cor) => doc.setTextColor(c[0], c[1], c[2]);
  const traco = (c: Cor = PRETO, esp = 0.3) => {
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(esp);
  };
  const fonte = (tam: number, estilo: "normal" | "bold" | "italic" = "normal") => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
  };
  const caixa = (x: number, y: number, w: number, h: number, esp = 0.3) => {
    traco(PRETO, esp);
    doc.rect(x, y, w, h);
  };
  const linha = (x1: number, y1: number, x2: number, y2: number, esp = 0.3, cor: Cor = PRETO) => {
    traco(cor, esp);
    doc.line(x1, y1, x2, y2);
  };
  const centro = (t: string, x: number, y: number, tam: number, estilo: "normal" | "bold" | "italic" = "normal", cor: Cor = PRETO, opcoes: { charSpace?: number } = {}) => {
    fonte(tam, estilo);
    ink(cor);
    doc.text(limpar(t), x, y, { align: "center", ...opcoes });
  };

  /** Altura necessária para "RÓTULO: valor" numa célula (o valor quebra em linhas, no máximo 3). */
  const medirCelula = (rotuloTxt: string, valor: string, w: number) => {
    fonte(7.2, "bold");
    const lw = doc.getTextWidth(limpar(rotuloTxt)) + 1.6;
    fonte(8.8, "normal");
    const linhas = (doc.splitTextToSize(limpar(valor || " "), w - lw - 4) as string[]).slice(0, 3);
    return { lw, linhas, h: Math.max(8.2, 3.6 + linhas.length * 3.9) };
  };

  const desenharCelula = (x: number, y: number, w: number, h: number, rotuloTxt: string, valor: string) => {
    const m = medirCelula(rotuloTxt, valor, w);
    caixa(x, y, w, h);
    fonte(7.2, "bold");
    ink(PRETO);
    doc.text(limpar(rotuloTxt), x + 1.8, y + 5.1);
    fonte(8.8, "normal");
    doc.text(m.linhas, x + 1.8 + m.lw, y + 5.1, { lineHeightFactor: 1.2 });
  };

  const desenharPagina = (pagina: number, total: number) => {
    // ---------------------------------------------------------- cabeçalho
    caixa(X0, 8, LARG, 16);
    linha(100, 8, 100, 24);
    linha(197, 8, 197, 24);
    // logotipos (texto provisório; troque por imagens quando tiver os arquivos)
    centro("SPDM", 55, 15.6, 16, "bold", AZUL);
    centro("PAIS", 55, 20.4, 7.5, "bold", CINZA, { charSpace: 1.4 });
    centro("SUS", 140, 17.6, 19, "bold", AZUL);
    doc.setFillColor(VERDE[0], VERDE[1], VERDE[2]);
    doc.rect(158.8, 11.5, 2.6, 9.6, "F");
    doc.rect(155.3, 15, 9.6, 2.6, "F");
    centro("FORTALEZA", 242, 15.6, 15, "bold", [60, 60, 60]);
    centro("PREFEITURA", 242, 19.6, 6.4, "normal", CINZA, { charSpace: 2 });
    // título e código do formulário
    caixa(X0, 24, LARG, 12);
    linha(217, 24, 217, 36);
    centro("Formulário", 113.5, 28.4, 8.5);
    centro("Prescrição Médica", 113.5, 34, 13, "bold");
    fonte(7.6, "normal");
    ink(PRETO);
    doc.text(limpar(`Código: ${MODELO.codigo}`), 219.5, 28);
    doc.text(limpar(`Revisão: ${MODELO.revisao}`), 219.5, 31.6);
    doc.text(limpar(`Página ${pagina} de ${total}`), 219.5, 35.2);

    // ---------------------------------------------------------- dados do paciente (automático)
    let y = 36;
    const linhas: { x: number; w: number; r: string; v: string; sexo?: boolean }[][] = [
      [
        { x: X0, w: 207, r: "NOME:", v: f.nome },
        { x: 217, w: 70, r: "SEXO:", v: "", sexo: true },
      ],
      [
        { x: X0, w: 62, r: "CNS:", v: f.cns ? formatarCns(f.cns) : "" },
        { x: 72, w: 70, r: "DATA DO NASCIMENTO:", v: f.data_nascimento ? formatarData(f.data_nascimento) : "" },
        { x: 142, w: 70, r: "PRONTUÁRIO:", v: f.prontuario },
        { x: 212, w: 75, r: "EMAD:", v: MODELO.emad },
      ],
      [
        { x: X0, w: 207, r: "HIPÓTESE DIAGNÓSTICA:", v: textoDiagnostico(f) },
        { x: 217, w: 70, r: "TELEFONE:", v: textoTelefone(f) },
      ],
      [{ x: X0, w: LARG, r: "ENDEREÇO:", v: textoEndereco(f) }],
    ];
    for (const linhaCelulas of linhas) {
      const h = Math.max(...linhaCelulas.map((c) => (c.sexo ? 8.2 : medirCelula(c.r, c.v, c.w).h)));
      for (const c of linhaCelulas) {
        if (c.sexo) {
          caixa(c.x, y, c.w, h);
          fonte(7.2, "bold");
          ink(PRETO);
          doc.text(c.r, c.x + 1.8, y + 5.1);
          const marca = (xx: number, ativo: boolean, letra: string) => {
            fonte(9, "normal");
            doc.text("(", xx, y + 5.2);
            if (ativo) {
              fonte(9, "bold");
              doc.text("X", xx + 1.75, y + 5.2);
            }
            fonte(9, "normal");
            doc.text(`)  ${letra}`, xx + 4.7, y + 5.2);
          };
          marca(c.x + 15, f.sexo === "M", "M");
          marca(c.x + 33, f.sexo === "F", "F");
        } else {
          desenharCelula(c.x, y, c.w, h, c.r, c.v);
        }
      }
      y += h;
    }

    // ---------------------------------------------------------- tabela de prescrição
    const topoTabela = y + 3.5;
    const hCab = 6.4, hMascara = 5.2;
    const xData = X0, xPresc = 34, xApraz = 197;
    const larguraDia = (X1 - xApraz) / 5;
    // cabeçalho
    caixa(xData, topoTabela, xPresc - xData, hCab + hMascara);
    caixa(xPresc, topoTabela, xApraz - xPresc, hCab + hMascara);
    caixa(xApraz, topoTabela, X1 - xApraz, hCab);
    centro("DATA", (xData + xPresc) / 2, topoTabela + 7.4, 8.5, "bold");
    centro("PRESCRIÇÃO", (xPresc + xApraz) / 2, topoTabela + 7.4, 8.5, "bold");
    centro("APRAZAMENTO", (xApraz + X1) / 2, topoTabela + 4.5, 8.5, "bold");
    for (let k = 0; k < 5; k++) {
      const xx = xApraz + k * larguraDia;
      caixa(xx, topoTabela + hCab, larguraDia, hMascara);
      centro("/       /", xx + larguraDia / 2, topoTabela + hCab + 3.7, 8, "normal", CINZA);
    }
    // corpo
    const inicioCorpo = topoTabela + hCab + hMascara;
    const fimCorpo = 176;
    const hLinha = (fimCorpo - inicioCorpo) / MODELO.linhasPorPagina;
    for (let i = 0; i < MODELO.linhasPorPagina; i++) {
      const yy = inicioCorpo + i * hLinha;
      caixa(xData, yy, xPresc - xData, hLinha, 0.25);
      caixa(xPresc, yy, xApraz - xPresc, hLinha, 0.25);
      for (let k = 0; k < 5; k++) caixa(xApraz + k * larguraDia, yy, larguraDia, hLinha, 0.25);
    }

    // ---------------------------------------------------------- assinaturas e rodapé
    linha(32, 188, 127, 188, 0.3);
    linha(170, 188, 265, 188, 0.3);
    centro("Assinatura/Carimbo do Médico (a)", 79.5, 192.2, 8.5);
    centro("Assinatura/Carimbo do Enfermeiro (a)", 217.5, 192.2, 8.5);
    fonte(6.6, "bold");
    ink(CINZA);
    doc.text(limpar(MODELO.rodape), X0, 202);
    fonte(6.2, "normal");
    doc.text(limpar(`Dados do paciente preenchidos pelo sistema EMAD 27 em ${d.geradoEm}`), X1, 202, { align: "right" });
  };

  for (let p = 1; p <= MODELO.paginas; p++) {
    if (p > 1) doc.addPage("a4", "landscape");
    desenharPagina(p, MODELO.paginas);
  }

  return { doc, nomeArquivo: `prescricao-${slug(f.nome) || "paciente"}-${d.hoje}.pdf` };
}

/** Monta o formulário e baixa o arquivo PDF. */
export async function gerarPrescricaoPdf(d: DadosPrescricao): Promise<void> {
  const { doc, nomeArquivo } = await montarPrescricaoPdf(d);
  doc.save(nomeArquivo);
}
