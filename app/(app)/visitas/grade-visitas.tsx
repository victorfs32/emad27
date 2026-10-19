"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { desfazerRegistro, registrarVisitaDia } from "../../actions";

export type DiaGrade = { iso: string; n: string; sem: string; fimDeSemana: boolean };
export type LinhaGrade = {
  id: number; nome: string; prontuario: string; total: number;
  /** data (yyyy-mm-dd) -> visitas registradas nesse dia */
  porDia: Record<string, { id: number; autor: string }[]>;
};
export type GrupoGrade = { uaps: string; pacientes: LinhaGrade[] };

type Props = { grupos: GrupoGrade[]; dias: DiaGrade[]; hoje: string; editar: boolean };

/** Grade paciente × dia do mês: clique num dia para marcar a visita (X); clique no X para desfazer. */
export function GradeVisitas({ grupos, dias, hoje, editar }: Props) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState("");

  const diaHoje = dias.find((d) => d.iso === hoje);

  function clicar(p: LinhaGrade, d: DiaGrade) {
    const visitas = p.porDia[d.iso] ?? [];
    setAviso("");
    if (visitas.length > 0) {
      const v = visitas[visitas.length - 1];
      const ok = window.confirm(
        `Remover a visita de ${p.nome} em ${d.iso.split("-").reverse().join("/")} (lançada por ${v.autor})? Use só para corrigir um lançamento por engano.`,
      );
      if (ok) iniciar(async () => { await desfazerRegistro(v.id); });
      return;
    }
    iniciar(async () => {
      const r = await registrarVisitaDia(p.id, d.iso);
      if (r.erro) setAviso(r.erro);
    });
  }

  return (
    <div>
      {aviso && <p role="alert" className="mb-3 mt-0 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{aviso}</p>}
      <div className={`overflow-x-auto rounded-[22px] border border-border bg-surface shadow-card transition ${pendente ? "opacity-60" : ""}`}>
        <table className="border-collapse text-center text-xs">
          <thead>
            <tr className="bg-[#0d5c63] text-white">
              <th className="sticky left-0 z-20 min-w-48 bg-[#0d5c63] px-4 py-2 text-left text-[11.5px] font-bold uppercase tracking-[0.06em]">Paciente</th>
              <th className="sticky left-48 z-20 hidden bg-[#0d5c63] px-2 py-2 text-[11.5px] font-bold uppercase sm:table-cell" style={{ left: 192 }}>Total</th>
              {dias.map((d) => (
                <th key={d.iso} className={`min-w-9 px-0.5 py-1.5 font-bold ${d.iso === hoje ? "bg-warning text-white" : d.fimDeSemana ? "bg-[#0a4a50]" : ""}`}>
                  <span className="block text-[10px] opacity-80">{d.sem}</span>
                  <span className="block text-[13px]">{d.n}</span>
                </th>
              ))}
            </tr>
          </thead>
          {grupos.map((g) => (
            <tbody key={g.uaps}>
              <tr>
                <th colSpan={2 + dias.length} className="sticky left-0 bg-accent-soft px-4 py-1.5 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-accent">{g.uaps}</th>
              </tr>
              {g.pacientes.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="sticky left-0 z-10 bg-surface px-4 py-1.5 text-left text-[13px] font-semibold">
                    <Link href={`/pacientes/${p.id}?aba=acompanhamento`} className="text-heading hover:text-accent">{p.nome}</Link>
                    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-secondary px-1 text-[11px] font-bold text-heading sm:hidden">{p.total}</span>
                    {editar && diaHoje && !(p.porDia[hoje]?.length) && (
                      <button
                        type="button"
                        disabled={pendente}
                        onClick={() => clicar(p, diaHoje)}
                        className="ml-2 rounded-lg border border-accent-soft-strong bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent hover:bg-accent hover:text-white"
                      >
                        + hoje
                      </button>
                    )}
                  </td>
                  <td className="sticky z-10 hidden bg-surface px-2 py-1.5 text-[13px] font-extrabold sm:table-cell" style={{ left: 192 }}>
                    <span className={p.total === 0 ? "text-danger-strong" : "text-heading"}>{p.total}</span>
                  </td>
                  {dias.map((d) => {
                    const v = p.porDia[d.iso] ?? [];
                    const futuro = d.iso > hoje;
                    const marcado = v.length > 0;
                    return (
                      <td key={d.iso} className={`border-l border-border/60 p-0 ${d.fimDeSemana ? "bg-secondary/60" : ""}`}>
                        {editar && (!futuro || marcado) ? (
                          <button
                            type="button"
                            disabled={pendente}
                            onClick={() => clicar(p, d)}
                            title={marcado ? `Visita por ${v.map((x) => x.autor).join(", ")}` : `Marcar visita em ${d.n}`}
                            aria-label={`${p.nome}, dia ${d.n}: ${marcado ? "visita registrada" : "sem visita"}`}
                            className={`flex h-9 w-9 items-center justify-center text-[13px] font-extrabold ${marcado ? "bg-[#d9f2e2] text-success-strong hover:bg-danger-soft hover:text-danger-strong" : "text-transparent hover:bg-accent-soft hover:text-accent"}`}
                          >
                            {marcado ? (v.length > 1 ? v.length : "X") : "+"}
                          </button>
                        ) : (
                          <span className={`flex h-9 w-9 items-center justify-center text-[13px] font-extrabold ${marcado ? "bg-[#d9f2e2] text-success-strong" : ""}`}>
                            {marcado ? (v.length > 1 ? v.length : "X") : ""}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
