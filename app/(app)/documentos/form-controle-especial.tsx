"use client";

import { useState, useTransition } from "react";
import { fichaParaDocumento } from "../../actions";
import { LINHAS_PRESCRICAO } from "@/lib/controle-especial-pdf";
import { enderecoDe } from "@/lib/documento-util";

type Props = { pacientes: { id: number; nome: string; prontuario: string }[]; hoje: string };

/** Receituário de controle especial: paciente e endereço entram sozinhos; o médico escreve a prescrição. */
export function FormControleEspecial({ pacientes, hoje }: Props) {
  const [paciente, setPaciente] = useState("");
  const [prescricao, setPrescricao] = useState("");
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
        const r = await fichaParaDocumento("controle_especial", Number(paciente));
        if (r.erro || !r.dados) {
          setErro(r.erro ?? "Não foi possível gerar o documento.");
          return;
        }
        const f = r.dados.ficha;
        const { gerarControleEspecialPdf } = await import("@/lib/controle-especial-pdf");
        await gerarControleEspecialPdf({ nome: f.nome, endereco: enderecoDe(f), prescricao: prescricao.trim(), data });
        setOk(`Receituário de ${f.nome} gerado.`);
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
          <label htmlFor="ce-paciente" className="rotulo">Paciente <span className="text-danger">*</span></label>
          <select id="ce-paciente" value={paciente} onChange={(e) => setPaciente(e.target.value)} required className="campo">
            <option value="">Escolha o paciente…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ce-data" className="rotulo">Data</label>
          <input id="ce-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required className="campo" />
        </div>
      </div>
      <div>
        <label htmlFor="ce-presc" className="rotulo">Prescrição <span className="text-danger">*</span></label>
        <textarea id="ce-presc" rows={7} maxLength={900} required value={prescricao} onChange={(e) => setPrescricao(e.target.value)} placeholder="Medicamento controlado, dose, via, frequência, quantidade e duração" className="campo" />
        <p className="mb-0 mt-1 text-xs text-muted">Cabem cerca de {LINHAS_PRESCRICAO} linhas no formulário. Sai em duas vias (farmácia e paciente).</p>
      </div>
      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {ok && <p role="status" className="m-0 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{ok}</p>}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>{pendente ? "Gerando…" : "Gerar receituário em PDF"}</button>
    </form>
  );
}
