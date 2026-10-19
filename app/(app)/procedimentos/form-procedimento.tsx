"use client";

import { useState, useTransition } from "react";
import { salvarProcedimento } from "../../actions";
import { PROCEDIMENTOS } from "@/lib/opcoes";

type Props = { pacientes: { id: number; nome: string; prontuario: string }[]; hoje: string };

export function FormProcedimento({ pacientes, hoje }: Props) {
  const [paciente, setPaciente] = useState("");
  const [tipo, setTipo] = useState<string>(PROCEDIMENTOS[0]);
  const [data, setData] = useState(hoje);
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState("");
  const [pendente, iniciar] = useTransition();

  function enviar() {
    setErro("");
    setSalvo("");
    iniciar(async () => {
      const r = await salvarProcedimento(Number(paciente), { data, tipo, obs });
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      const nome = pacientes.find((p) => String(p.id) === paciente)?.nome ?? "";
      setSalvo(`${tipo} registrado para ${nome}.`);
      // mantém data e tipo (comum registrar vários seguidos); limpa só paciente e observação
      setPaciente("");
      setObs("");
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="proc-paciente" className="rotulo">Paciente <span className="text-danger">*</span></label>
          <select id="proc-paciente" value={paciente} onChange={(e) => { setPaciente(e.target.value); setSalvo(""); }} required className="campo">
            <option value="">Escolha o paciente…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
          </select>
        </div>
        <div>
          <label className="rotulo">Procedimento <span className="text-danger">*</span></label>
          <div role="radiogroup" className="flex flex-wrap gap-1.5">
            {PROCEDIMENTOS.map((p) => (
              <button
                key={p} type="button" role="radio" aria-checked={tipo === p} onClick={() => setTipo(p)}
                className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${tipo === p ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:bg-secondary"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="proc-data" className="rotulo">Data <span className="text-danger">*</span></label>
          <input id="proc-data" type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} required className="campo" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="proc-obs" className="rotulo">Observações</label>
          <input id="proc-obs" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={1000} placeholder="Ex.: nº da sonda, medicação, local do acesso, intercorrência" className="campo" />
        </div>
      </div>

      {erro && <p role="alert" className="m-0 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {salvo && <p role="status" className="m-0 rounded-2xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{salvo}</p>}

      <div><button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Registrar procedimento"}</button></div>
    </form>
  );
}
