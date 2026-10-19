import { connection } from "next/server";
import Link from "next/link";
import type { ItemLista } from "@/lib/pacientes";
import { calcularIdade, formatarData } from "@/lib/opcoes";
import { SeloStatus } from "./selo-status";

function Etiquetas({ p }: { p: ItemLista }) {
  const itens = [p.lpp && "LPP", p.tqt && "TQT", p.o2 && "O₂"].filter(Boolean);
  return (
    <>
      {itens.map((t) => (
        <span key={String(t)} className="ml-1.5 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted">{t}</span>
      ))}
    </>
  );
}

export async function TabelaPacientes({ pacientes }: { pacientes: ItemLista[] }) {
  await connection(); // idade usa a data atual
  return (
    <>
      {/* Celular: cartões */}
      <ul className="m-0 grid list-none gap-2.5 p-0 md:hidden">
        {pacientes.map((p) => {
          const idade = calcularIdade(p.data_nascimento);
          return (
            <li key={p.id}>
              <Link href={`/pacientes/${p.id}`} className="block rounded-[22px] border border-border bg-surface px-4 py-4 shadow-card active:bg-detail">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-heading">{p.nome}<Etiquetas p={p} /></strong>
                  <SeloStatus status={p.situacao} />
                </div>
                <p className="mb-0 mt-1 text-sm text-muted">
                  Pront. {p.prontuario}
                  {[idade !== null && `${idade} anos`, p.modalidade, p.uaps].filter(Boolean).map((x) => ` · ${x}`).join("")}
                </p>
                <p className="mb-0 mt-1.5 text-xs text-muted">
                  {p.bairro ? `${p.bairro} · ` : ""}Últ. evolução: {formatarData(p.ultima_evolucao)}
                  {p.proxima_visita && ` · Próx. visita: ${formatarData(p.proxima_visita)}`}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Computador: tabela */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">
              <th className="px-5 py-3">Prontuário</th>
              <th className="px-3 py-3">Paciente</th>
              <th className="px-3 py-3">Idade</th>
              <th className="px-3 py-3">UAPS</th>
              <th className="px-3 py-3">Situação</th>
              <th className="px-3 py-3">Mod.</th>
              <th className="px-5 py-3">Próx. visita</th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p) => (
              <tr key={p.id} className="border-t border-border transition hover:bg-detail">
                <td className="px-5 py-3.5 font-medium tabular-nums">{p.prontuario}</td>
                <td className="px-3 py-3.5 font-semibold">
                  <Link href={`/pacientes/${p.id}`} className="text-heading hover:text-accent">{p.nome}</Link>
                  <Etiquetas p={p} />
                </td>
                <td className="px-3 py-3.5">{calcularIdade(p.data_nascimento) ?? "—"}</td>
                <td className="px-3 py-3.5">{p.uaps || "—"}</td>
                <td className="px-3 py-3.5"><SeloStatus status={p.situacao} /></td>
                <td className="px-3 py-3.5">{p.modalidade || "—"}</td>
                <td className="px-5 py-3.5">{formatarData(p.proxima_visita)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
