"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { dadosPrescricaoSalva, excluirPrescricao } from "../../../../actions";

type Props = { pacienteId: number; id: number; podeImprimir: boolean; podePrescrever: boolean; podeAlterar: boolean };

/** Botões de cada prescrição salva: imprimir (PDF), renovar, editar e remover. */
export function AcoesPrescricao({ pacienteId, id, podeImprimir, podePrescrever, podeAlterar }: Props) {
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function imprimir() {
    setErro("");
    iniciar(async () => {
      try {
        const r = await dadosPrescricaoSalva(id);
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

  function remover() {
    if (!window.confirm("Remover esta prescrição? O conteúdo fica guardado no histórico do paciente.")) return;
    setErro("");
    iniciar(async () => {
      const r = await excluirPrescricao(id);
      if (r.erro) setErro(r.erro);
    });
  }

  const base = "btn-secundario !min-h-9 !px-3 !text-xs";
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {podeImprimir && <button type="button" onClick={imprimir} disabled={pendente} className={base}>{pendente ? "Aguarde…" : "Imprimir (PDF)"}</button>}
        {podePrescrever && <Link href={`/pacientes/${pacienteId}/prescricoes/nova?copiar=${id}`} className={base}>Renovar</Link>}
        {podePrescrever && podeAlterar && <Link href={`/pacientes/${pacienteId}/prescricoes/${id}`} className={base}>Editar</Link>}
        {podePrescrever && podeAlterar && <button type="button" onClick={remover} disabled={pendente} className={`${base} !text-danger-strong`}>Remover</button>}
      </div>
      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-3 py-2 text-xs font-semibold text-danger-strong">{erro}</p>}
    </div>
  );
}
