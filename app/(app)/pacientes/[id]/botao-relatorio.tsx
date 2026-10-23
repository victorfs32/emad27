"use client";

import { useState, useTransition } from "react";
import { dadosRelatorio } from "../../../actions";
import { IconeBaixar } from "../../icones";

/** Gera e baixa o relatório do paciente em PDF. A biblioteca de PDF só é carregada ao clicar. */
export function BotaoRelatorio({ pacienteId }: { pacienteId: number }) {
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function gerar() {
    setErro("");
    iniciar(async () => {
      try {
        const r = await dadosRelatorio(pacienteId);
        if (r.erro || !r.dados) {
          setErro(r.erro ?? "Não foi possível gerar o relatório.");
          return;
        }
        const { gerarRelatorioPdf } = await import("@/lib/relatorio-pdf");
        await gerarRelatorioPdf(r.dados);
      } catch (e) {
        console.error(e);
        setErro("Não foi possível gerar o PDF. Tente novamente.");
      }
    });
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={gerar}
        disabled={pendente}
        className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-accent shadow-card transition hover:bg-accent-soft disabled:opacity-70"
      >
        <IconeBaixar className="h-4 w-4" />
        {pendente ? "Gerando PDF…" : "Relatório em PDF"}
      </button>
      {erro && <p role="alert" className="m-0 max-w-64 rounded-xl bg-danger-soft px-3 py-2 text-xs font-semibold text-danger-strong">{erro}</p>}
    </div>
  );
}
