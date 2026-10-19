import { connection } from "next/server";
import Link from "next/link";
import { listarProximasVisitas } from "@/lib/pacientes";
import { formatarData, hojeISO } from "@/lib/opcoes";
import { IconeCalendario } from "../icones";
import { SeloStatus } from "../selo-status";

export default async function ProximasVisitas() {
  await connection();
  const visitas = await listarProximasVisitas();
  const hoje = hojeISO();
  const limite = hojeISO(7);

  const grupos = [
    { titulo: "Atrasadas", tom: "text-danger-strong", itens: visitas.filter((v) => v.proxima_visita! < hoje) },
    { titulo: "Hoje", tom: "text-accent", itens: visitas.filter((v) => v.proxima_visita === hoje) },
    { titulo: "Próximos 7 dias", tom: "text-heading", itens: visitas.filter((v) => v.proxima_visita! > hoje && v.proxima_visita! <= limite) },
    { titulo: "Mais adiante", tom: "text-muted", itens: visitas.filter((v) => v.proxima_visita! > limite) },
  ].filter((g) => g.itens.length > 0);

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">Agenda da equipe</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">
          Próximas visitas<span className="text-accent">.</span>
        </h1>
        <p className="m-0 mt-1 text-sm text-muted">Pacientes com visita agendada, da mais próxima para a mais distante.</p>
      </header>

      {grupos.length === 0 ? (
        <div className="rounded-[22px] border border-border bg-surface px-5 py-12 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <IconeCalendario className="h-7 w-7" />
          </span>
          <p className="mb-0 mt-3 font-bold text-heading">Nenhuma visita programada</p>
          <p className="mb-0 mt-1 text-sm text-muted">Defina a data da próxima visita na ficha de cada paciente.</p>
        </div>
      ) : (
        grupos.map((g) => (
          <section key={g.titulo}>
            <h2 className={`mb-2 px-1 text-base font-bold ${g.tom}`}>
              {g.titulo} <span className="text-[12.5px] font-medium text-muted">({g.itens.length})</span>
            </h2>
            <ul className="grid gap-2.5">
              {g.itens.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/pacientes/${p.id}`}
                    className="flex flex-wrap items-center gap-4 rounded-[22px] border border-border bg-surface px-5 py-4 shadow-card transition hover:border-accent-soft-strong"
                  >
                    <span className="flex h-12 w-14 flex-none flex-col items-center justify-center rounded-2xl bg-accent-soft text-accent">
                      <strong className="text-base leading-none">{formatarData(p.proxima_visita).slice(0, 5)}</strong>
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-heading">{p.nome}</strong>
                      <small className="text-muted">{[`Pront. ${p.prontuario}`, p.bairro, p.uaps].filter(Boolean).join(" · ")}</small>
                    </span>
                    <SeloStatus status={p.situacao} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
