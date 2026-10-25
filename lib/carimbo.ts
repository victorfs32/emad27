// Carimbo do profissional (nome, cargo, conselho e registro de especialista), impresso acima da assinatura.
import type { jsPDF as JsPDF } from "jspdf";

export type DadosCarimbo = { nome: string; cargo?: string | null; registro?: string | null; registro_especialista?: string | null };

/** Linhas do carimbo, como no carimbo de papel: nome, cargo, conselho e registro de especialista. */
export function linhasCarimbo(d: DadosCarimbo): string[] {
  // sem cargo nem registro não há carimbo: a assinatura fica em branco, para assinar à mão
  if (!d.cargo?.trim() && !d.registro?.trim() && !d.registro_especialista?.trim()) return [];
  const linhas = [d.nome.trim()];
  if (d.cargo?.trim()) linhas.push(d.cargo.trim().toUpperCase());
  if (d.registro?.trim()) linhas.push(d.registro.trim().toUpperCase());
  if (d.registro_especialista?.trim()) linhas.push(`REGISTRO DE ESPECIALISTA: ${d.registro_especialista.trim().toUpperCase()}`);
  return linhas.filter(Boolean);
}

const limpar = (t: string) => t.replace(/[‘’]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…“”]/g, "");

/** Escreve o carimbo centralizado em xCentro, terminando logo acima da linha de assinatura (yLinha). */
export function desenharCarimbo(doc: JsPDF, linhas: string[] | undefined, xCentro: number, yLinha: number, larguraMax = 80) {
  if (!linhas?.length) return;
  const passo = 3.3;
  const texto = linhas.slice(0, 5).map(limpar);
  texto.forEach((l, i) => {
    const y = yLinha - 1.6 - (texto.length - 1 - i) * passo;
    doc.setFont("helvetica", i === 0 ? "bold" : "normal");
    doc.setTextColor(20, 20, 20);
    // reduz a letra até a linha caber na largura disponível
    let tam = 7.6;
    doc.setFontSize(tam);
    while (doc.getTextWidth(l) > larguraMax && tam > 5.2) {
      tam -= 0.3;
      doc.setFontSize(tam);
    }
    doc.text(l, xCentro, y, { align: "center", maxWidth: larguraMax });
  });
}
