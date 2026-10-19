"use client";

import { useState, useTransition } from "react";
import { salvarVisita } from "../../actions";

type Props = { pacientes: { id: number; nome: string; prontuario: string }[]; hoje: string };

export function FormVisita({ pacientes, hoje }: Props) {
  const [paciente, setPaciente] = useState("");
  const [data, setData] = useState(hoje);
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState("");
  const [pendente, iniciar] = useTransition();

  function enviar() {
    setErro("");
    setSalvo("");
    iniciar(async () => {
      const r = await salvarVisita(Number(paciente), data, nota);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      const nome = pacientes.find((p) => String(p.id) === paciente)?.nome ?? "";
      setSalvo(`Visita de ${data.split("-").reverse().join("/")} registrada para ${nome}.`);
      // mantém a data (comum lançar várias visitas do mesmo dia); limpa paciente e observação
      setPaciente("");
      setNota("");
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="vis-paciente" className="rotulo">Paciente <span className="text-danger">*</span></label>
          <select id="vis-paciente" value={paciente} onChange={(e) => { setPaciente(e.target.value); setSalvo(""); }} required className="campo">
            <option value="">Escolha o paciente…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="vis-data" className="rotulo">Data da visita <span className="text-danger">*</span></label>
          <input id="vis-data" type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} required className="campo" />
        </div>
      </div>
      <div>
        <label htmlFor="vis-nota" className="rotulo">Observações (opcional)</label>
        <input id="vis-nota" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={1000} placeholder="O que foi feito ou observado na visita" className="campo" />
      </div>

      {erro && <p role="alert" className="m-0 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {salvo && <p role="status" className="m-0 rounded-2xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{salvo}</p>}

      <div><button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Registrar visita"}</button></div>
    </form>
  );
}
