import Link from "next/link";
import { listarPacientes, resumoPainel } from "@/lib/pacientes";
import { FiltrosLista } from "./filtros-lista";
import { IconeBaixar, IconeCalendario, IconeCoracao, IconeMais, IconePessoas, IconePrancheta } from "./icones";
import { TabelaPacientes } from "./tabela-pacientes";

function Indicador({
  rotulo, valor, apoio, icone: Icone, destaque,
}: {
  rotulo: string; valor: number; apoio: string; icone: typeof IconePessoas; destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] p-5 ${
        destaque
          ? "bg-brand-gradient text-white shadow-[0_18px_40px_-16px_rgba(22,115,209,0.55)]"
          : "border border-border bg-surface shadow-card"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`m-0 text-[13px] font-semibold ${destaque ? "text-white/80" : "text-muted"}`}>{rotulo}</p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            destaque ? "bg-white/15 text-white" : "bg-accent-soft text-accent"
          }`}
        >
          <Icone className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className={`mb-0 mt-3 text-[40px] font-extrabold leading-none tracking-[-0.03em] ${destaque ? "" : "text-heading"}`}>
        {valor}
      </p>
      <p className={`mb-0 mt-2 text-xs ${destaque ? "text-white/75" : "text-muted"}`}>{apoio}</p>
    </div>
  );
}

export default async function Listagem({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const um = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const filtros = {
    busca: um("q"),
    status: um("status"),
    modalidade: um("modalidade"),
    lpp: um("lpp") === "1",
    grupo: "principais" as const,
  };

  const [pacientes, resumo] = await Promise.all([listarPacientes(filtros), resumoPainel()]);
  const filtrando = filtros.busca || filtros.status || filtros.modalidade || filtros.lpp;

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">
            Gestão do cuidado · EMAD 27
          </p>
          <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">
            Pacientes<span className="text-accent">.</span>
          </h1>
          <p className="m-0 mt-1 text-sm text-muted">Cada pessoa, um cuidado. Todas as informações em um só lugar.</p>
        </div>
        <Link href="/pacientes/novo" className="btn-primario">
          <IconeMais className="h-5 w-5" /> Novo paciente
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" aria-label="Resumo">
        <Indicador destaque rotulo="Pacientes cadastrados" valor={resumo.cadastrados} apoio="Na lista principal" icone={IconePessoas} />
        <Indicador rotulo="Em acompanhamento" valor={resumo.acompanhamento} apoio="Cuidado em continuidade" icone={IconeCoracao} />
        <Indicador rotulo="Visitas programadas" valor={resumo.visitas7dias} apoio="De hoje aos próximos 7 dias" icone={IconeCalendario} />
        <Indicador rotulo="Pacientes com LPP" valor={resumo.lpp} apoio="Conforme o cadastro" icone={IconePrancheta} />
      </section>

      <section className="rounded-[22px] border border-border bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
          <h2 className="m-0 flex items-center gap-2 text-base font-bold text-heading">
            Lista de pacientes
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-muted">{pacientes.length}</span>
          </h2>
          <a href="/exportar" className="btn-secundario !min-h-10 !px-4 !text-sm" download>
            <IconeBaixar className="h-4 w-4" /> Exportar CSV
          </a>
        </div>

        <div className="px-4 pb-4 sm:px-5">
          <FiltrosLista {...filtros} />
        </div>

        {pacientes.length === 0 ? (
          <div className="border-t border-border px-5 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <IconePessoas className="h-7 w-7" />
            </span>
            <p className="mb-0 mt-3 font-bold text-heading">
              {filtrando ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado ainda"}
            </p>
            <p className="mb-0 mt-1 text-sm text-muted">
              {filtrando ? "Ajuste a busca ou os filtros." : "Use “Novo paciente” para fazer o primeiro cadastro."}
            </p>
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
