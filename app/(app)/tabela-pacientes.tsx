import Link from "next/link";
import type { ItemLista } from "@/lib/pacientes";
import { calcularIdade, formatarData } from "@/lib/opcoes";
import { SeloStatus } from "./selo-status";

const Lpp = () => (
  <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-bold text-danger-strong">LPP</span>
);

export function TabelaPacientes({ pacientes }: { pacientes: ItemLista[] }) {
  return (
    <>
      {/* Celular: cartões */}
      <ul className="grid gap-2.5 md:hidden">
        {pacientes.map((p) => {
          const idade = calcularIdade(p.data_nascimento);
          return (
            <li key={p.id}>
              <Link
                href={`/pacientes/${p.id}`}
                className="block rounded-[22px] border border-border bg-surface px-4 py-4 shadow-card active:bg-detail"
              >
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-heading">
                    {p.nome}
                    {p.possui_lpp && <Lpp />}
                  </strong>
                  <SeloStatus status={p.status} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {[idade !== null && `${idade} anos`, p.bairro, p.modalidade].filter(Boolean).join(" · ") || "—"}
                </p>
                {p.diagnostico && <p className="mt-1 text-sm">{p.diagnostico}</p>}
                <p className="mt-1.5 text-xs text-muted">
                  Últ. evolução: {formatarData(p.ultima_evolucao)}
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
              <th className="px-5 py-3">Paciente</th>
              <th className="px-3 py-3">Idade</th>
              <th className="px-3 py-3">Bairro</th>
              <th className="px-3 py-3">Diagnóstico</th>
              <th className="px-3 py-3">Mod.</th>
              <th className="px-3 py-3">Situação</th>
              <th className="px-3 py-3">Próx. visita</th>
              <th className="px-5 py-3">Últ. evolução</th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p) => (
              <tr key={p.id} className="border-t border-border transition hover:bg-detail">
                <td className="px-5 py-3.5 font-semibold">
                  <Link href={`/pacientes/${p.id}`} className="text-heading hover:text-accent">
                    {p.nome}
                  </Link>
                  {p.possui_lpp && <Lpp />}
                </td>
                <td className="px-3 py-3.5">{calcularIdade(p.data_nascimento) ?? "—"}</td>
                <td className="px-3 py-3.5">{p.bairro || "—"}</td>
                <td className="px-3 py-3.5">{p.diagnostico || "—"}</td>
                <td className="px-3 py-3.5">{p.modalidade || "—"}</td>
                <td className="px-3 py-3.5"><SeloStatus status={p.status} /></td>
                <td className="px-3 py-3.5">{formatarData(p.proxima_visita)}</td>
                <td className="px-5 py-3.5">{formatarData(p.ultima_evolucao)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
