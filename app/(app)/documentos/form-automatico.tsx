"use client";

import { useState, useTransition } from "react";
import { dadosDietaEnteral } from "../../actions";

type Props = { tipo: "dieta_enteral"; pacientes: { id: number; nome: string; prontuario: string }[]; botao: string };

/** Documento sem digitação: escolhe o paciente e o PDF sai todo preenchido pelo cadastro. */
export function FormAutomatico({ tipo, pacientes, botao }: Props) {
  const [paciente, setPaciente] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [pendente, iniciar] = useTransition();

  function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOk("");
    iniciar(async () => {
      try {
        if (tipo === "dieta_enteral") {
          const r = await dadosDietaEnteral(Number(paciente));
          if (r.erro || !r.dados) {
            setErro(r.erro ?? "Não foi possível gerar o documento.");
            return;
          }
          const { gerarDietaEnteralPdf } = await import("@/lib/dieta-enteral-pdf");
          await gerarDietaEnteralPdf(r.dados);
          setOk(`Documento de ${r.dados.nome} gerado.`);
        }
      } catch (err) {
        console.error(err);
        setErro("Não foi possível gerar o PDF. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={gerar} className="grid gap-4">
      <div>
        <label htmlFor={`aut-${tipo}`} className="rotulo">Paciente <span className="text-danger">*</span></label>
        <select id={`aut-${tipo}`} value={paciente} onChange={(e) => setPaciente(e.target.value)} required className="campo">
          <option value="">Escolha o paciente…</option>
          {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
        </select>
      </div>
      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {ok && <p role="status" className="m-0 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{ok}</p>}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>{pendente ? "Gerando…" : botao}</button>
    </form>
  );
}
