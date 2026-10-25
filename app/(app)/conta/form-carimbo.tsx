"use client";

import { useState, useTransition } from "react";
import { salvarCarimbo } from "../../actions";
import { linhasCarimbo } from "@/lib/carimbo";

type Props = { nome: string; cargo: string; registro: string; especialista: string };

/** Carimbo do próprio usuário: sai impresso acima da assinatura nos documentos. */
export function FormCarimbo({ nome, cargo: cargo0, registro: registro0, especialista: especialista0 }: Props) {
  const [cargo, setCargo] = useState(cargo0);
  const [registro, setRegistro] = useState(registro0);
  const [especialista, setEspecialista] = useState(especialista0);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [pendente, iniciar] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOk("");
    iniciar(async () => {
      const r = await salvarCarimbo(cargo, registro, especialista);
      if (r.erro) setErro(r.erro);
      else setOk("Carimbo salvo. Ele já sai nos próximos documentos.");
    });
  }

  const previa = linhasCarimbo({ nome, cargo, registro, registro_especialista: especialista });

  return (
    <form onSubmit={salvar} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="car-cargo" className="rotulo">Cargo</label>
          <input id="car-cargo" value={cargo} maxLength={60} onChange={(e) => setCargo(e.target.value)} placeholder="Ex.: Enfermeiro, Médica" className="campo" />
        </div>
        <div>
          <label htmlFor="car-reg" className="rotulo">Conselho e número</label>
          <input id="car-reg" value={registro} maxLength={80} onChange={(e) => setRegistro(e.target.value)} placeholder="Ex.: COREN - CE: 570127 ou CRM-CE 12345" className="campo" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="car-esp" className="rotulo">Registro de especialista (opcional)</label>
          <input id="car-esp" value={especialista} maxLength={80} onChange={(e) => setEspecialista(e.target.value)} placeholder="Ex.: 55630 - Nefrologista" className="campo" />
        </div>
      </div>
      <div>
        <p className="rotulo m-0">Como vai sair no documento</p>
        <div className="mt-1 rounded-2xl border border-dashed border-border bg-detail px-4 py-3 text-center text-[13px] leading-snug text-heading">
          {previa.map((l, i) => <div key={i} className={i === 0 ? "font-bold" : ""}>{l}</div>)}
        </div>
      </div>
      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {ok && <p role="status" className="m-0 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{ok}</p>}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>{pendente ? "Salvando…" : "Salvar carimbo"}</button>
    </form>
  );
}
