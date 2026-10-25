"use client";

import { useState, useTransition } from "react";
import { dadosAtestado } from "../../actions";

type Props = { pacientes: { id: number; nome: string; prontuario: string }[]; hoje: string; carimbo?: string[] };

/** Atestado médico: escolhe o paciente, escreve o texto e baixa o PDF. */
export function FormAtestado({ pacientes, hoje, carimbo }: Props) {
  const [paciente, setPaciente] = useState("");
  const [texto, setTexto] = useState("");
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
        const r = await dadosAtestado(Number(paciente));
        if (r.erro || !r.nome) {
          setErro(r.erro ?? "Não foi possível gerar o atestado.");
          return;
        }
        const { gerarAtestadoPdf } = await import("@/lib/atestado-pdf");
        await gerarAtestadoPdf({ nome: r.nome, texto: texto.trim(), data, carimbo });
        setOk(`Atestado de ${r.nome} gerado.`);
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
          <label htmlFor="at-paciente" className="rotulo">Paciente <span className="text-danger">*</span></label>
          <select id="rec-paciente" value={paciente} onChange={(e) => setPaciente(e.target.value)} required className="campo">
            <option value="">Escolha o paciente…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="at-data" className="rotulo">Data</label>
          <input id="rec-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required className="campo" />
        </div>
      </div>
      <div>
        <label htmlFor="at-med" className="rotulo">Texto do atestado <span className="text-danger">*</span></label>
        <textarea
          id="rec-med"
          rows={9}
          maxLength={1200}
          required
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: Atesto, para os devidos fins, que o paciente acima encontra-se em acompanhamento domiciliar pelo Programa Melhor em Casa…"
          className="campo"
        />
      </div>
      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {ok && <p role="status" className="m-0 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{ok}</p>}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>{pendente ? "Gerando…" : "Gerar atestado em PDF"}</button>
    </form>
  );
}
