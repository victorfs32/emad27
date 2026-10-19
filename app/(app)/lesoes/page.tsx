import Link from "next/link";
import { connection } from "next/server";
import { listarLesoes } from "@/lib/pacientes";
import { formatarData, hojeISO } from "@/lib/opcoes";
import { IconeLesao } from "../icones";

export default async function Lesoes() {
  await connection();
  const lesoes = await listarLesoes();
  const hoje = hojeISO();
  const dias = (iso: string) => Math.floor((Date.parse(hoje) - Date.parse(iso)) / 86400000);
  const pacientes = new Set(lesoes.map((l) => l.pacientes.id)).size;

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">Lesão por pressão (LPP)</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Lesões<span className="text-accent">.</span></h1>
        <p className="m-0 mt-1 text-sm text-muted">
          {lesoes.length} {lesoes.length === 1 ? "lesão registrada" : "lesões registradas"} em {pacientes} {pacientes === 1 ? "paciente" : "pacientes"}.
          As avaliações mais antigas aparecem primeiro.
        </p>
      </header>

      {lesoes.length === 0 ? (
        <div className="rounded-[22px] border border-border bg-surface px-5 py-12 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><IconeLesao className="h-7 w-7" /></span>
          <p className="mb-0 mt-3 font-bold text-heading">Nenhuma lesão registrada</p>
          <p className="mb-0 mt-1 text-sm text-muted">Cadastre as lesões na ficha do paciente (Informações clínicas → Lesão por pressão = Sim).</p>
        </div>
      ) : (
        <>
          <ul className="m-0 grid list-none gap-2.5 p-0 md:hidden">
            {lesoes.map((l) => (
              <li key={l.id}>
                <Link href={`/pacientes/${l.pacientes.id}?aba=clinico`} className="block rounded-[22px] border border-border bg-surface px-4 py-4 shadow-card">
                  <strong className="text-heading">{l.pacientes.nome}</strong>
                  <p className="mb-0 mt-1 text-sm text-heading">{l.localizacao} <span className="text-muted">· {l.classificacao || "classificação não informada"}</span></p>
                  <p className="mb-0 mt-1 text-xs text-muted">
                    Cobertura: {l.cobertura || "não informada"} · avaliação: {l.data_avaliacao ? `${formatarData(l.data_avaliacao)} (há ${dias(l.data_avaliacao)} dias)` : "não informada"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-[22px] border border-border bg-surface shadow-card md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">
                  <th className="px-5 py-3">Paciente</th>
                  <th className="px-3 py-3">Localização</th>
                  <th className="px-3 py-3">Classificação</th>
                  <th className="px-3 py-3">Cobertura</th>
                  <th className="px-5 py-3">Última avaliação</th>
                </tr>
              </thead>
              <tbody>
                {lesoes.map((l) => {
                  const d = l.data_avaliacao ? dias(l.data_avaliacao) : null;
                  return (
                    <tr key={l.id} className="border-t border-border transition hover:bg-detail">
                      <td className="px-5 py-3.5 font-semibold">
                        <Link href={`/pacientes/${l.pacientes.id}?aba=clinico`} className="text-heading hover:text-accent">{l.pacientes.nome}</Link>
                        <span className="ml-2 text-xs font-normal text-muted">Pront. {l.pacientes.prontuario}</span>
                      </td>
                      <td className="px-3 py-3.5">{l.localizacao}</td>
                      <td className="px-3 py-3.5">{l.classificacao || "—"}</td>
                      <td className="px-3 py-3.5">{l.cobertura || "—"}</td>
                      <td className="px-5 py-3.5">
                        {l.data_avaliacao ? formatarData(l.data_avaliacao) : "Não informada"}
                        {d !== null && d > 14 && (
                          <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-bold text-warning-strong">há {d} dias</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
