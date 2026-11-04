"use client";

import { useState, useTransition } from "react";
import { registrarEvolucaoClinica, type DadosEvolucao } from "../../actions";
import { TITULO_CATEGORIA, dataHoraBR, sinaisVitais, type CategoriaEvolucao, type EvolucaoClinica } from "@/lib/evolucao-regras";
import type { PacientePdf } from "@/lib/evolucao-pdf";
import { IconeBaixar } from "../icones";

type Props = {
  pacienteId: number; pacientePdf: PacientePdf; evolucoes: EvolucaoClinica[]; faltaMigracao: boolean;
  categoria: CategoriaEvolucao | null; autor: { nome: string; cargo: string; registro: string }; hoje: string; agora: string;
};


async function baixar(p: PacientePdf, lista: EvolucaoClinica[]) {
  const { baixarEvolucoesPdf } = await import("@/lib/evolucao-pdf");
  await baixarEvolucoesPdf(p, lista);
}

export function PainelEvolucoes({ pacienteId, pacientePdf, evolucoes, faltaMigracao, categoria, autor, agora }: Props) {
  const [gerando, setGerando] = useState<number | "todas" | null>(null);
  const [erroPdf, setErroPdf] = useState("");

  async function pdf(alvo: number | "todas") {
    setErroPdf("");
    setGerando(alvo);
    try {
      await baixar(pacientePdf, alvo === "todas" ? evolucoes : evolucoes.filter((e) => e.id === alvo));
    } catch (e) {
      console.error(e);
      setErroPdf("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGerando(null);
    }
  }

  return (
    <div className="grid gap-6">
      {faltaMigracao && (
        <p role="alert" className="m-0 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">
          Falta rodar a migração v20 no Supabase para guardar as evoluções.
        </p>
      )}

      {categoria && !faltaMigracao && <FormEvolucao pacienteId={pacienteId} categoria={categoria} autor={autor} agora={agora} />}

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-lg font-bold text-heading">
            Histórico de evoluções <span className="text-sm font-medium text-muted">({evolucoes.length})</span>
          </h2>
          {evolucoes.length > 0 && (
            <button type="button" onClick={() => pdf("todas")} disabled={gerando !== null} className="btn-primario">
              <IconeBaixar /> {gerando === "todas" ? "Gerando PDF…" : "PDF do histórico"}
            </button>
          )}
        </div>
        {erroPdf && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erroPdf}</p>}

        {evolucoes.length === 0 ? (
          <p className="cartao m-0 text-center text-sm text-muted">Nenhuma evolução registrada para este paciente.</p>
        ) : (
          <ol className="m-0 grid list-none gap-3 p-0">
            {evolucoes.map((e) => (
              <li key={e.id} className="cartao grid gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${e.categoria === "medica" ? "bg-accent-soft text-accent" : "bg-success-soft text-success-strong"}`}>
                      {TITULO_CATEGORIA[e.categoria]}
                    </span>
                    <p className="m-0 mt-1.5 text-sm font-semibold text-heading">{dataHoraBR(e.dataHora)}</p>
                  </div>
                  <button
                    type="button" onClick={() => pdf(e.id)} disabled={gerando !== null}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold text-heading hover:bg-secondary"
                  >
                    <IconeBaixar className="h-4 w-4" /> {gerando === e.id ? "Gerando…" : "PDF"}
                  </button>
                </div>
                {sinaisVitais(e).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {sinaisVitais(e).map(([r, v]) => (
                      <span key={r} className="rounded-lg bg-detail px-2.5 py-1 text-sm"><strong className="text-heading">{r}</strong> {v}</span>
                    ))}
                  </div>
                )}
                <div>
                  <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-muted">Evolução</p>
                  <p className="m-0 mt-1 whitespace-pre-wrap text-[15px] text-heading">{e.evolucao}</p>
                </div>
                {e.conduta && (
                  <div>
                    <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-muted">Conduta / plano</p>
                    <p className="m-0 mt-1 whitespace-pre-wrap text-[15px] text-heading">{e.conduta}</p>
                  </div>
                )}
                <p className="m-0 border-t border-border pt-2 text-sm text-muted">
                  <strong className="text-heading">{e.autor}</strong>
                  {[e.autorCargo, e.autorRegistro].filter(Boolean).length > 0 && ` · ${[e.autorCargo, e.autorRegistro].filter(Boolean).join(" · ")}`}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

const VAZIO: DadosEvolucao = { dataHora: "", pa: "", fc: "", fr: "", temperatura: "", spo2: "", glicemia: "", dor: "", evolucao: "", conduta: "" };

function FormEvolucao({ pacienteId, categoria, autor, agora }: { pacienteId: number; categoria: CategoriaEvolucao; autor: Props["autor"]; agora: string }) {
  const [d, setD] = useState<DadosEvolucao>({ ...VAZIO, dataHora: agora });
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const set = (k: keyof DadosEvolucao, v: string) => setD((p) => ({ ...p, [k]: v }));

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm("Salvar a evolução? Depois de salva ela não pode ser alterada.")) return;
    setAviso(null);
    iniciar(async () => {
      const r = await registrarEvolucaoClinica(pacienteId, d);
      if (r.erro) setAviso({ ok: false, texto: r.erro });
      else {
        setAviso({ ok: true, texto: "Evolução salva no histórico do paciente." });
        setD({ ...VAZIO, dataHora: agora });
      }
    });
  }

  const vital = (k: keyof DadosEvolucao, rotulo: string, ph: string, modo: "numeric" | "decimal" | "text" = "decimal") => (
    <div>
      <label htmlFor={`ev-${k}`} className="rotulo">{rotulo}</label>
      <input id={`ev-${k}`} value={d[k]} onChange={(e) => set(k, e.target.value)} inputMode={modo} maxLength={k === "pa" ? 20 : 10} placeholder={ph} className="campo" />
    </div>
  );

  return (
    <form onSubmit={salvar} className="cartao grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 text-base font-bold text-heading">Nova {TITULO_CATEGORIA[categoria].toLowerCase()}</h2>
        <span className="text-sm text-muted">{[autor.nome, autor.cargo, autor.registro].filter(Boolean).join(" · ")}</span>
      </div>
      <div className="grid gap-3 sm:max-w-xs">
        <div>
          <label htmlFor="ev-data" className="rotulo">Data e hora do atendimento</label>
          <input id="ev-data" type="datetime-local" value={d.dataHora} onChange={(e) => set("dataHora", e.target.value)} required className="campo" />
        </div>
      </div>
      <fieldset className="m-0 grid gap-3 border-0 p-0">
        <legend className="rotulo">Sinais vitais (opcional)</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {vital("pa", "PA (mmHg)", "120x80", "text")}
          {vital("fc", "FC (bpm)", "80", "numeric")}
          {vital("fr", "FR (irpm)", "18", "numeric")}
          {vital("temperatura", "Temp. (°C)", "36,5")}
          {vital("spo2", "SpO₂ (%)", "96", "numeric")}
          {vital("glicemia", "Glicemia (mg/dL)", "110", "numeric")}
          <div>
            <label htmlFor="ev-dor" className="rotulo">Dor (0–10)</label>
            <select id="ev-dor" value={d.dor} onChange={(e) => set("dor", e.target.value)} className="campo">
              <option value="">—</option>
              {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>
      </fieldset>
      <div>
        <label htmlFor="ev-texto" className="rotulo">Evolução <span className="text-danger">*</span></label>
        <textarea
          id="ev-texto" value={d.evolucao} onChange={(e) => set("evolucao", e.target.value)} required rows={7} maxLength={8000}
          placeholder="Queixas, estado geral, exame físico, avaliação…" className="campo"
        />
      </div>
      <div>
        <label htmlFor="ev-conduta" className="rotulo">Conduta / plano</label>
        <textarea id="ev-conduta" value={d.conduta} onChange={(e) => set("conduta", e.target.value)} rows={3} maxLength={4000} className="campo" />
      </div>
      {aviso && (
        <p role="status" className={`m-0 rounded-xl px-4 py-3 text-sm font-semibold ${aviso.ok ? "bg-success-soft text-success-strong" : "bg-danger-soft text-danger-strong"}`}>
          {aviso.texto}
        </p>
      )}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar evolução"}
      </button>
    </form>
  );
}
