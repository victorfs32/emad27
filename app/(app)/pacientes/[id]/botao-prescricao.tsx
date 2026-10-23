"use client";

import { useState, useTransition } from "react";
import { dadosPrescricao } from "../../../actions";
import { IconeBaixar } from "../../icones";

/** Gera o formulário de prescrição médica do paciente (dados preenchidos) em PDF. */
export function BotaoPrescricao({ pacienteId }: { pacienteId: number }) {
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function gerar() {
    setErro("");
    iniciar(async () => {
      try {
        const r = await dadosPrescricao(pacienteId);
        if (r.erro || !r.dados) {
          setErro(r.erro ?? "Não foi possível gerar o formulário.");
          return;
        }
        const { gerarPrescricaoPdf } = await import("@/lib/prescricao-pdf");
        await gerarPrescricaoPdf(r.dados);
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
        {pendente ? "Gerando…" : "Prescrição (formulário)"}
      </button>
      {erro && <p role="alert" className="m-0 max-w-64 rounded-xl bg-danger-soft px-3 py-2 text-xs font-semibold text-danger-strong">{erro}</p>}
    </div>
  );
}
