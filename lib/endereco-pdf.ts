// Folha de endereço do paciente para o motorista (A4 retrato): endereço, referência e telefones de contato.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import { desenharLogo, PROPORCAO_LOGO } from "./logo";

export type DadosEnderecoPdf = {
  nome: string;
  prontuario: string;
  /** Rua, número e complemento. */
  rua: string;
  /** Bairro e município. */
  local: string;
  cep: string;
  referencia: string;
  contatos: { numero: string; quem: string; whatsapp: boolean }[];
  /** Link do Google Maps para o endereço. */
  mapa: string;
  /** dd/mm/aaaa hh:mm */
  geradoEm: string;
};

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");
const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function montarEnderecoPdf(d: DadosEnderecoPdf): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const { jsPDF } = await import("jspdf");
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.setProperties({
    title: `Endereço — ${d.nome}`,
    author: "EMAD 27",
    subject: "Endereço para visita domiciliar",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const X0 = 20, X1 = 190, LARG = X1 - X0;
  const fonte = (tam: number, estilo: "normal" | "bold" = "normal", cor: [number, number, number] = [20, 20, 20]) => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(cor[0], cor[1], cor[2]);
  };
  const altLinha = (tam: number, fator = 1.25) => tam * 0.3528 * fator;
  /** Texto com quebra de linha; devolve o y logo abaixo do último trecho. */
  const paragrafo = (texto: string, y: number, tam: number, estilo: "normal" | "bold" = "normal") => {
    fonte(tam, estilo);
    const linhas = doc.splitTextToSize(limpar(texto), LARG) as string[];
    doc.text(linhas, X0, y);
    return y + linhas.length * altLinha(tam);
  };
  const rotulo = (texto: string, y: number) => {
    fonte(9.5, "bold", [70, 85, 85]);
    doc.text(texto.toUpperCase(), X0, y);
    return y + 6;
  };
  const divisoria = (y: number) => {
    doc.setDrawColor(190, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(X0, y, X1, y);
  };

  // cabeçalho
  const larguraLogo = 50;
  desenharLogo(doc, X0, 14, larguraLogo);
  fonte(15, "bold");
  doc.text("ENDEREÇO PARA VISITA", X1, 24, { align: "right" });
  fonte(10, "normal", [70, 85, 85]);
  doc.text("EMAD 27 — Programa Melhor em Casa", X1, 30, { align: "right" });
  let y = 14 + larguraLogo * PROPORCAO_LOGO + 6;
  divisoria(y);
  y += 10;

  // paciente
  y = rotulo("Paciente", y);
  y = paragrafo(d.nome, y + 2, 20, "bold");
  fonte(11, "normal", [70, 85, 85]);
  doc.text(`Prontuário ${limpar(d.prontuario)}`, X0, y + 1);
  y += 10;

  // endereço
  y = rotulo("Endereço", y);
  y = paragrafo(d.rua || "Rua não informada", y + 2, 18, "bold");
  y = paragrafo(d.local || "Bairro não informado", y + 1, 15);
  if (d.cep) y = paragrafo(`CEP ${d.cep}`, y + 1, 13);
  if (d.mapa) {
    fonte(11, "normal", [29, 111, 87]);
    doc.textWithLink("Abrir no mapa (Google Maps)", X0, y + 3, { url: d.mapa });
    y += 6;
  }
  y += 6;

  if (d.referencia) {
    y = rotulo("Ponto de referência", y);
    y = paragrafo(d.referencia, y + 2, 15) + 6;
  }

  divisoria(y);
  y += 10;

  // telefones
  y = rotulo("Telefones de contato", y);
  if (!d.contatos.length) {
    y = paragrafo("Nenhum telefone no cadastro.", y + 2, 13);
  } else {
    for (const c of d.contatos) {
      if (y > 268) break;
      fonte(17, "bold");
      doc.text(limpar(c.numero), X0, y + 4);
      const largura = doc.getTextWidth(limpar(c.numero));
      fonte(11.5, "normal", [70, 85, 85]);
      doc.text(limpar(`${c.quem}${c.whatsapp ? " · WhatsApp" : ""}`), X0 + largura + 5, y + 4, { maxWidth: LARG - largura - 5 });
      y += 10;
    }
  }

  // rodapé
  fonte(8.5, "normal", [110, 120, 120]);
  doc.text(`Gerado em ${limpar(d.geradoEm)} · Dados do cadastro do paciente — uso interno da equipe.`, 105, 285, { align: "center" });

  return { doc, nomeArquivo: `endereco-${slug(d.nome) || "paciente"}.pdf` };
}

export async function gerarEnderecoPdf(d: DadosEnderecoPdf): Promise<void> {
  const { doc, nomeArquivo } = await montarEnderecoPdf(d);
  doc.save(nomeArquivo);
}
