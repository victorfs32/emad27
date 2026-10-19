import { connection } from "next/server";
import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { lerFiltros, listarBairros, listarPacientes, listarUapss, resumoPainel } from "@/lib/pacientes";
import { FiltrosLista } from "./filtros-lista";
import { IconeBaixar, IconeCalendario, IconeCoracao, IconeMais, IconePessoas, IconePrancheta } from "./icones";
import { TabelaPacientes } from "./tabela-pacientes";

function Indicador({
  rotulo, valor, apoio, icone: Icone, destaque,
}: { rotulo: string; valor: number; apoio: string; icone: typeof IconePessoas; destaque?: boolean }) {
  return (
    <div className={`rounded-[22px] p-5 ${destaque ? "border border-accent-soft-strong bg-accent-soft" : "border border-border bg-surface shadow-card"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-[13px] font-semibold text-muted">{rotulo}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-accent ${destaque ? "bg-white" : "bg-accent-soft"}`}>
          <Icone className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mb-0 mt-3 text-[40px] font-extrabold leading-none tracking-[-0.03em] text-heading">{valor}</p>
      <p className="mb-0 mt-2 text-xs text-muted">{apoio}</p>
    </div>
  );
}

function Distribuicao({ titulo, itens }: { titulo: string; itens: { nome: string; n: number }[] }) {
  const max = Math.max(1, ...itens.map((i) => i.n));
  return (
    <div className="cartao">
      <h3 className="m-0 mb-3 text-sm font-bold text-heading">{titulo}</h3>
      {itens.length === 0 ? (
        <p className="m-0 text-sm text-muted">Sem dados.</p>
      ) : (
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {itens.slice(0, 6).map((i) => (
            <li key={i.nome}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate text-heading">{i.nome}</span>
                <strong className="text-heading">{i.n}</strong>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(i.n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function Listagem({ searchParams }: PageProps<"/">) {
  await connection();
  const sp = await searchParams;
  const filtros = lerFiltros(sp, "principais");
  const [usuario, pacientes, resumo, uapss, bairros] = await Promise.all([
    exigirUsuario(), listarPacientes(filtros), resumoPainel(), listarUapss(), listarBairros(),
  ]);
  const filtrando = Object.entries(filtros).some(([k, v]) => k !== "grupo" && v);
  const query = new URLSearchParams(Object.entries(filtros).filter(([k, v]) => k !== "grupo" && v) as [string, string][]).toString();

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">Gestão do cuidado · EMAD 27</p>
          <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">
            Pacientes<span className="text-accent">.</span>
          </h1>
          <p className="m-0 mt-1 text-sm text-muted">Cada pessoa, um cuidado. Todas as informações em um só lugar.</p>
        </div>
        {usuario.perms.cadastrar && (
          <Link href="/pacientes/novo" className="btn-primario"><IconeMais className="h-5 w-5" /> Novo paciente</Link>
        )}
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" aria-label="Resumo">
        <Indicador destaque rotulo="Pacientes cadastrados" valor={resumo.cadastrados} apoio="Ativos e internados" icone={IconePessoas} />
        <Indicador rotulo="Em acompanhamento" valor={resumo.ativos} apoio="Situação ativa" icone={IconeCoracao} />
        <Indicador rotulo="Visitas programadas" valor={resumo.visitas7dias} apoio="De hoje aos próximos 7 dias" icone={IconeCalendario} />
        <Indicador rotulo="Pacientes com LPP" valor={resumo.lpp} apoio="Conforme o cadastro" icone={IconePrancheta} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Distribuição">
        <div className="cartao">
          <h3 className="m-0 mb-3 text-sm font-bold text-heading">Cuidados especiais</h3>
          <dl className="m-0 grid gap-2 text-sm">
            {[["Traqueostomia (TQT)", resumo.tqt], ["Oxigênio (O₂)", resumo.o2], ["Alimentação por sonda", resumo.sonda]].map(([r, n]) => (
              <div key={r as string} className="flex justify-between"><dt className="text-muted">{r}</dt><dd className="m-0 font-bold text-heading">{n}</dd></div>
            ))}
          </dl>
        </div>
        <Distribuicao titulo="Por modalidade" itens={resumo.porModalidade} />
        <div className="sm:col-span-2"><Distribuicao titulo="Por UAPS" itens={resumo.porUaps} /></div>
      </section>

      <section className="rounded-[22px] border border-border bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
          <h2 className="m-0 flex items-center gap-2 text-base font-bold text-heading">
            Lista de pacientes
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-muted">{pacientes.length}</span>
          </h2>
          {usuario.perms.exportar && (
            <a href={`/exportar${query ? `?${query}` : ""}`} className="btn-secundario !min-h-10 !px-4 !text-sm" download>
              <IconeBaixar className="h-4 w-4" /> Exportar CSV{filtrando ? " (filtrado)" : ""}
            </a>
          )}
        </div>

        <div className="px-4 pb-4 sm:px-5">
          <FiltrosLista f={filtros} uapss={uapss} bairros={bairros} />
        </div>

        {pacientes.length === 0 ? (
          <div className="border-t border-border px-5 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><IconePessoas className="h-7 w-7" /></span>
            <p className="mb-0 mt-3 font-bold text-heading">{filtrando ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado ainda"}</p>
            <p className="mb-0 mt-1 text-sm text-muted">{filtrando ? "Ajuste a busca ou os filtros." : "Use “Novo paciente” para fazer o primeiro cadastro."}</p>
          </div>
        ) : (
          <div className="border-t border-border p-3 md:p-0"><TabelaPacientes pacientes={pacientes} /></div>
        )}
      </section>
    </div>
  );
}
