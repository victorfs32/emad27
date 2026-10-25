"use client";

import { useState, useTransition } from "react";
import { dadosReceituario } from "../../actions";

type Props = { pacientes: { id: number; nome: string; prontuario: string }[]; hoje: string; carimbo?: string[] };

/** Receituário médico: escolhe o paciente, escreve o medicamento e baixa o PDF (duas vias). */
export function FormReceituario({ pacientes, hoje, carimbo }: Props) {
  const [paciente, setPaciente] = useState("");
  const [medicamento, setMedicamento] = useState("");
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [pendente, iniciar] = useTransition();

  function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOk("");
    iniciar(async () => {
      try {
        const r = await dadosReceituario(Number(paciente));
        if (r.erro || !r.nome) {
          setErro(r.erro ?? "Não foi possível gerar o receituário.");
          return;
        }
        const { gerarReceituarioPdf } = await import("@/lib/receituario-pdf");
        await gerarReceituarioPdf({ nome: r.nome, medicamento: medicamento.trim(), data, carimbo });
        setOk(`Receituário de ${r.nome} gerado.`);
      } catch (err) {
        console.error(err);
        setErro("Não foi possível gerar o PDF. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={gerar} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_minmax(0,12rem)]">
        <div>
          <label htmlFor="rec-paciente" className="rotulo">Paciente <span className="text-danger">*</span></label>
          <select id="rec-paciente" value={paciente} onChange={(e) => setPaciente(e.target.value)} required className="campo">
            <option value="">Escolha o paciente…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rec-data" className="rotulo">Data</label>
          <input id="rec-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required className="campo" />
        </div>
      </div>
      <div>
        <label htmlFor="rec-med" className="rotulo">Medicamento e posologia <span className="text-danger">*</span></label>
        <textarea
          id="rec-med"
          rows={6}
          maxLength={1500}
          required
          value={medicamento}
          onChange={(e) => setMedicamento(e.target.value)}
          placeholder="Ex.: Dipirona 500 mg — 1 comprimido por via oral de 6/6h, se dor ou febre. Quantidade: 1 caixa."
          className="campo"
        />
      </div>
      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {ok && <p role="status" className="m-0 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{ok}</p>}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>{pendente ? "Gerando…" : "Gerar receituário em PDF"}</button>
    </form>
  );
}
