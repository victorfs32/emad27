"use client";

import { useState } from "react";
import type { Comum, Quadro } from "@/lib/indicadores-pdf";
import { IconeBaixar } from "../icones";

/** Moldura de um quadro de indicador, no visual da planilha: faixa laranja, conteúdo e faixa amarela de orientação. */
export function Moldura({ id, titulo, nota, acoes, children }: {
  id: string; titulo: string; nota?: React.ReactNode; acoes?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section id={id} className="grid scroll-mt-4 gap-3">
      <div className="overflow-hidden rounded-[22px] border border-border bg-surface shadow-card">
        <h2 className="m-0 bg-[#ffc000] px-4 py-2.5 text-center text-base font-extrabold tracking-wide text-[#1a1a1a] sm:text-lg">{titulo}</h2>
        {children}
        {nota && <p className="m-0 bg-[#ffff00] px-4 py-2 text-center text-sm text-[#1a1a1a]">{nota}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-3">{acoes}</div>}
    </section>
  );
}

/** Linha de cabeçalho (só em telas maiores), com a cor da planilha. */
export function Cabecalho({ cor, grade, colunas }: { cor: string; grade: string; colunas: string[] }) {
  return (
    <div className={`hidden text-sm font-bold text-[#1a1a1a] sm:grid ${grade}`} style={{ backgroundColor: cor }}>
      {colunas.map((c, i) => <span key={i} className={`px-3 py-2 ${i === 0 ? "text-center" : ""}`}>{c}</span>)}
    </div>
  );
}

/** Coluna EMAD (só em telas maiores), com a cor da planilha. */
export function ColunaEmad({ cor }: { cor: string }) {
  return <span className="hidden items-center justify-center text-lg font-extrabold text-[#1a1a1a] sm:flex" style={{ backgroundColor: cor }}>27</span>;
}

/** Botão que gera o PDF de um quadro (a biblioteca de PDF só é carregada ao clicar). */
export function BotaoPdf({ quadro, comum, rotulo = "Baixar PDF" }: { quadro: () => Promise<Quadro>; comum: Comum; rotulo?: string }) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  async function gerar() {
    setErro("");
    setGerando(true);
    try {
      const { baixarIndicadorPdf } = await import("@/lib/indicadores-pdf");
      await baixarIndicadorPdf(await quadro(), comum);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }
  return (
    <>
      <button type="button" onClick={gerar} disabled={gerando} className="btn-primario">
        <IconeBaixar /> {gerando ? "Gerando PDF…" : rotulo}
      </button>
      {erro && <span role="alert" className="text-sm font-semibold text-danger-strong">{erro}</span>}
    </>
  );
}

/** Mensagem curta de resultado ao salvar. */
export function Aviso({ aviso }: { aviso: { ok: boolean; texto: string } | null }) {
  if (!aviso) return null;
  return <span className={`text-sm font-semibold ${aviso.ok ? "text-success-strong" : "text-danger-strong"}`}>{aviso.texto}</span>;
}
