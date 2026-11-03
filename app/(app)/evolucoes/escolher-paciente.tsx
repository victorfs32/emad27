"use client";

import { useRouter } from "next/navigation";

/** Escolha do paciente: troca o endereço da página (/evolucoes?paciente=ID). */
export function EscolherPaciente({ pacientes, atual }: { pacientes: { id: number; nome: string; prontuario: string }[]; atual: number | null }) {
  const router = useRouter();
  return (
    <div className="cartao">
      <label htmlFor="ev-paciente" className="rotulo">Paciente</label>
      <select
        id="ev-paciente" value={atual ?? ""} className="campo"
        onChange={(e) => router.push(e.target.value ? `/evolucoes?paciente=${e.target.value}` : "/evolucoes")}
      >
        <option value="">Escolha o paciente…</option>
        {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
      </select>
    </div>
  );
}
