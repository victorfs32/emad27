"use client";

import { useState } from "react";
import type { DadosListaPdf } from "@/lib/lista-pdf";
import { IconeBaixar } from "./icones";

/** Botão que gera o relatório em PDF de uma lista (a biblioteca de PDF só é carregada ao clicar). */
export function BotaoPdfLista({ dados, rotulo }: { dados: Omit<DadosListaPdf, "geradoEm">; rotulo: string }) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  async function gerar() {
    setErro("");
    setGerando(true);
    try {
      const { baixarListaPdf } = await import("@/lib/lista-pdf");
      const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
      await baixarListaPdf({ ...dados, geradoEm });
    } catch (e) {
      console.error(e);
      setErro("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }
  return (
    <div className="grid gap-1">
      <button type="button" onClick={gerar} disabled={gerando} className="btn-primario">
        <IconeBaixar /> {gerando ? "Gerando PDF…" : rotulo}
      </button>
      {erro && <span role="alert" className="text-sm font-semibold text-danger-strong">{erro}</span>}
    </div>
  );
}
