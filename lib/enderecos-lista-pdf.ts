// Lista de endereços de vários pacientes numa tabela (A4 paisagem), para o motorista organizar o roteiro.
// Roda no navegador (a biblioteca de PDF é carregada só quando o botão é clicado).
import type { jsPDF as JsPDF } from "jspdf";
import { desenharLogo, PROPORCAO_LOGO } from "./logo";

export type LinhaEndereco = {
  nome: string;
  prontuario: string;
  internado: boolean;
  /** Rua, número e complemento. */
  rua: string;
  bairro: string;
  /** Município e CEP. */
  cidade: string;
  referencia: string;
  /** Um telefone por linha, já formatado, com de quem é. */
  telefones: string[];
};

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");

export async function montarListaEnderecosPdf(linhas: LinhaEndereco[], geradoEm: string): Promise<{ doc: JsPDF; nomeArquivo: string }> {
  const [{ jsPDF }, tabela] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = tabela.default;
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape", compress: true });
  doc.setProperties({
    title: "Endereços dos pacientes",
    author: "EMAD 27",
    subject: "Endereços para visita domiciliar",
    creator: "EMAD 27 — Programa Melhor em Casa",
  });

  const X0 = 10, X1 = 287;
  const larguraLogo = 34;
  const altLogo = larguraLogo * PROPORCAO_LOGO;

  const cabecalho = () => {
    desenharLogo(doc, X0, 7, larguraLogo);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.text("ENDEREÇOS DOS PACIENTES", X1, 14, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70, 85, 85);
    doc.text(`EMAD 27 — Programa Melhor em Casa · ${linhas.length} paciente${linhas.length === 1 ? "" : "s"}`, X1, 19.5, { align: "right" });
  };

  autoTable(doc, {
    startY: 7 + altLogo + 3,
    margin: { left: X0, right: 297 - X1, top: 7 + altLogo + 3, bottom: 14 },
    head: [["Nº", "Paciente", "Endereço", "Bairro", "Ponto de referência", "Telefones de contato"]],
    body: linhas.map((l, i) => [
      String(i + 1),
      limpar(`${l.nome}\nPront. ${l.prontuario}${l.internado ? " · INTERNADO" : ""}`),
      limpar([l.rua || "Rua não informada", l.cidade].filter(Boolean).join("\n")),
      limpar(l.bairro || "—"),
      limpar(l.referencia || "—"),
      limpar(l.telefones.length ? l.telefones.join("\n") : "—"),
    ]),
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 1.8, textColor: [20, 20, 20], lineColor: [190, 200, 200], lineWidth: 0.2, valign: "top" },
    headStyles: { fillColor: [29, 111, 87], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: [244, 248, 247] },
    columnStyles: {
      0: { cellWidth: 9, halign: "center" },
      1: { cellWidth: 52, fontStyle: "bold" },
      2: { cellWidth: 66 },
      3: { cellWidth: 32 },
      4: { cellWidth: 58 },
      5: { cellWidth: "auto" },
    },
    rowPageBreak: "avoid",
    didDrawPage: () => {
      cabecalho();
      const pagina = doc.getCurrentPageInfo().pageNumber;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 120, 120);
      doc.text(`Gerado em ${limpar(geradoEm)} · Dados do cadastro dos pacientes — uso interno da equipe.`, X0, 203);
      doc.text(`Página ${pagina}`, X1, 203, { align: "right" });
    },
  });

  return { doc, nomeArquivo: "enderecos-pacientes-emad27.pdf" };
}

export async function gerarListaEnderecosPdf(linhas: LinhaEndereco[], geradoEm: string): Promise<void> {
  const { doc, nomeArquivo } = await montarListaEnderecosPdf(linhas, geradoEm);
  doc.save(nomeArquivo);
}
