import { listarPacientes } from "@/lib/pacientes";
import { FiltrosLista } from "../filtros-lista";
import { IconeArquivo } from "../icones";
import { TabelaPacientes } from "../tabela-pacientes";

export default async function Arquivados({ searchParams }: PageProps<"/arquivados">) {
  const sp = await searchParams;
  const um = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const filtros = {
    busca: um("q"),
    status: um("status"),
    modalidade: um("modalidade"),
    lpp: um("lpp") === "1",
    grupo: "arquivados" as const,
  };
  const pacientes = await listarPacientes(filtros);

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">Histórico</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">
          Arquivados<span className="text-accent">.</span>
        </h1>
        <p className="m-0 mt-1 text-sm text-muted">
          Pacientes com alta ou óbito. Para reativar, abra a ficha e altere a situação.
        </p>
      </header>

      <section className="rounded-[22px] border border-border bg-surface shadow-card">
        <div className="p-4 sm:p-5">
          <FiltrosLista {...filtros} />
        </div>
        {pacientes.length === 0 ? (
          <div className="border-t border-border px-5 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <IconeArquivo className="h-7 w-7" />
            </span>
            <p className="mb-0 mt-3 font-bold text-heading">Nenhum paciente arquivado</p>
          </div>
        ) : (
          <div className="border-t border-border p-3 md:p-0">
            <TabelaPacientes pacientes={pacientes} />
          </div>
        )}
      </section>
    </div>
  );
}
