"use client";

import { useRouter } from "next/navigation";

type Props = { pacientes: { id: number; nome: string; prontuario: string }[]; atual: number | null };

/** Escolhe o paciente e recarrega a tela com as prescrições dele. */
export function EscolherPaciente({ pacientes, atual }: Props) {
  const roteador = useRouter();
  return (
    <div>
      <label htmlFor="presc-paciente" className="rotulo">Paciente</label>
      <select
        id="presc-paciente"
        value={atual ?? ""}
        onChange={(e) => roteador.push(e.target.value ? `/prescricoes?paciente=${e.target.value}` : "/prescricoes")}
        className="campo"
      >
        <option value="">Todos — prescrições mais recentes</option>
        {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
      </select>
    </div>
  );
}
