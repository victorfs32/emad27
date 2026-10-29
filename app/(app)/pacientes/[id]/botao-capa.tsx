"use client";

import { useState, useTransition } from "react";
import { dadosCapa } from "../../../actions";
import { IconeBaixar } from "../../icones";

/** Gera e baixa a capa do prontuário domiciliar (A4) com os dados do cadastro. A biblioteca de PDF só é carregada ao clicar. */
export function BotaoCapa({ pacienteId }: { pacienteId: number }) {
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function gerar() {
    setErro("");
    iniciar(async () => {
      try {
        const r = await dadosCapa(pacienteId);
        if (r.erro || !r.dados) {
          setErro(r.erro ?? "Não foi possível gerar a capa.");
          return;
        }
        const { gerarCapaPdf } = await import("@/lib/capa-pdf");
        await gerarCapaPdf(r.dados);
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
        {pendente ? "Gerando PDF…" : "Capa do prontuário"}
      </button>
      {erro && <p role="alert" className="m-0 max-w-64 rounded-xl bg-danger-soft px-3 py-2 text-xs font-semibold text-danger-strong">{erro}</p>}
    </div>
  );
}
