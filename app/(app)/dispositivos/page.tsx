import Link from "next/link";
import { connection } from "next/server";
import { exigirUsuario } from "@/lib/auth";
import { listarDispositivos, listarPacientesBasico, type DispositivoLinha } from "@/lib/pacientes";
import { TIPOS_DISPOSITIVO, formatarData, hojeISO, situacaoTroca } from "@/lib/opcoes";
import { registrarTroca } from "../../actions";
import { IconeDispositivo, IconeMais } from "../icones";
import { BotaoRemover } from "./botao-remover";
import { FormDispositivo } from "./form-dispositivo";

const sigla = (tipo: string) => TIPOS_DISPOSITIVO.find((t) => t.valor === tipo)?.sigla ?? tipo;
const ordemTipo = (tipo: string) => TIPOS_DISPOSITIVO.findIndex((t) => t.valor === tipo);

const COR_PROXIMA = {
  vencida: "bg-danger-soft text-danger-strong",
  proxima: "bg-warning-soft text-warning-strong",
  ok: "bg-[#fff7cc] text-[#6b5b00]", // amarelo, como na planilha
  sem: "bg-secondary text-muted",
} as const;

function Proxima({ d, hoje }: { d: DispositivoLinha; hoje: string }) {
  const s = situacaoTroca(d.proxima_troca, hoje);
  return (
    <span className={`inline-block whitespace-nowrap rounded-lg px-2.5 py-1 text-sm font-bold ${COR_PROXIMA[s]}`}>
      {d.proxima_troca ? formatarData(d.proxima_troca) : "Sem data"}
      {s === "vencida" && " · vencida"}
    </span>
  );
}

function Acoes({ d, hoje, editar }: { d: DispositivoLinha; hoje: string; editar: boolean }) {
  if (!editar) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={registrarTroca.bind(null, d.id)} className="flex items-center gap-1.5">
        <input type="date" name="data" defaultValue={hoje} max={hoje} required aria-label="Data da troca" className="campo !w-auto !rounded-xl !px-2.5 !py-1.5 !text-sm" />
        <button className="rounded-xl bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-hover" style={{ minHeight: 40 }}>Trocou</button>
      </form>
      <Link href={`/dispositivos?editar=${d.id}`} className="inline-flex items-center rounded-xl border border-border px-3 text-sm font-semibold text-heading hover:bg-secondary" style={{ minHeight: 40 }}>
        Editar
      </Link>
      <BotaoRemover id={d.id} descricao={`${sigla(d.tipo)} de ${d.pacientes.nome}`} />
    </div>
  );
}

export default async function Dispositivos({ searchParams }: PageProps<"/dispositivos">) {
  await connection();
  const sp = await searchParams;
  const tipo = typeof sp.tipo === "string" ? sp.tipo : "";
  const prazo = typeof sp.prazo === "string" ? sp.prazo : "";
  const idEdicao = typeof sp.editar === "string" ? Number(sp.editar) : null;

  const [usuario, todos] = await Promise.all([exigirUsuario(), listarDispositivos()]);
  const editar = usuario.perms.editar;
  const pacientes = editar ? await listarPacientesBasico() : [];
  const hoje = hojeISO();

  const vencidas = todos.filter((d) => situacaoTroca(d.proxima_troca, hoje) === "vencida").length;
  const proximas = todos.filter((d) => situacaoTroca(d.proxima_troca, hoje) === "proxima").length;

  const lista = todos
    .filter((d) => !tipo || d.tipo === tipo)
    .filter((d) => {
      const s = situacaoTroca(d.proxima_troca, hoje);
      return prazo === "vencidas" ? s === "vencida" : prazo === "30" ? s === "vencida" || s === "proxima" : true;
    })
    .sort((a, b) =>
      (a.pacientes.uaps?.nome ?? "~").localeCompare(b.pacientes.uaps?.nome ?? "~", "pt-BR") ||
      a.pacientes.nome.localeCompare(b.pacientes.nome, "pt-BR") ||
      ordemTipo(a.tipo) - ordemTipo(b.tipo),
    );

  // Agrupa por UAPS, como na planilha.
  const grupos = new Map<string, DispositivoLinha[]>();
  for (const d of lista) {
    const k = d.pacientes.uaps?.nome ?? "UAPS não informada";
    grupos.set(k, [...(grupos.get(k) ?? []), d]);
  }

  const edicao = idEdicao ? todos.find((d) => d.id === idEdicao) : undefined;
  const href = (t: string, p: string) => {
    const q = new URLSearchParams();
    if (t) q.set("tipo", t);
    if (p) q.set("prazo", p);
    return q.size ? `/dispositivos?${q}` : "/dispositivos";
  };
  const chip = (ativo: boolean) =>
    `whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${ativo ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:text-heading"}`;

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">Controle de trocas</p>
          <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Dispositivos<span className="text-accent">.</span></h1>
          <p className="m-0 mt-1 text-sm text-muted">GTT, SNG, SNE, SVD e cistostomia: número, confecção, troca e próxima troca de cada paciente.</p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3" aria-label="Resumo">
        {[
          ["Dispositivos em uso", todos.length, "text-heading"],
          ["Trocas vencidas", vencidas, vencidas ? "text-danger-strong" : "text-heading"],
          ["Vencem em 30 dias", proximas, proximas ? "text-warning-strong" : "text-heading"],
        ].map(([r, n, cor]) => (
          <div key={r as string} className="rounded-[22px] border border-border bg-surface p-4 shadow-card">
            <p className="m-0 text-xs font-semibold text-muted sm:text-[13px]">{r}</p>
            <p className={`mb-0 mt-2 text-[32px] font-extrabold leading-none tracking-[-0.03em] ${cor}`}>{n}</p>
          </div>
        ))}
      </section>

      {editar && edicao && (
        <section className="cartao" aria-label="Editar dispositivo">
          <h2 className="m-0 mb-1 text-base font-bold text-heading">Editar dispositivo</h2>
          <p className="mb-4 mt-0 text-sm text-muted">{edicao.pacientes.nome} — pront. {edicao.pacientes.prontuario}</p>
          <FormDispositivo
            key={edicao.id}
            inicial={{
              id: edicao.id, paciente_id: edicao.paciente_id, tipo: edicao.tipo, numero: edicao.numero ?? "",
              confeccao: edicao.confeccao ?? "", troca: edicao.troca ?? "", proxima_troca: edicao.proxima_troca ?? "", obs: edicao.obs ?? "",
            }}
          />
        </section>
      )}

      {editar && !edicao && (
        <details className="cartao group">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-base font-bold text-heading">
            <IconeMais className="h-5 w-5 text-accent" /> Registrar dispositivo
          </summary>
          <div className="mt-4"><FormDispositivo pacientes={pacientes} /></div>
        </details>
      )}

      <nav className="-mx-4 flex flex-wrap gap-2 px-4 lg:mx-0 lg:px-0" aria-label="Filtros">
        <Link href={href("", prazo)} className={chip(!tipo)}>Todos</Link>
        {TIPOS_DISPOSITIVO.map((t) => <Link key={t.valor} href={href(t.valor, prazo)} className={chip(tipo === t.valor)}>{t.sigla}</Link>)}
        <span className="mx-1 hidden w-px bg-border sm:block" aria-hidden />
        <Link href={href(tipo, prazo === "30" ? "" : "30")} className={chip(prazo === "30")}>Vencidas e próximos 30 dias</Link>
        <Link href={href(tipo, prazo === "vencidas" ? "" : "vencidas")} className={chip(prazo === "vencidas")}>Só vencidas</Link>
      </nav>

      {lista.length === 0 ? (
        <div className="rounded-[22px] border border-border bg-surface px-5 py-12 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><IconeDispositivo className="h-7 w-7" /></span>
          <p className="mb-0 mt-3 font-bold text-heading">{todos.length === 0 ? "Nenhum dispositivo registrado" : "Nada encontrado com esses filtros"}</p>
          <p className="mb-0 mt-1 text-sm text-muted">{todos.length === 0 ? "Use “Registrar dispositivo” para começar." : "Ajuste os filtros acima."}</p>
        </div>
      ) : (
        <>
          {/* Celular: cartões por UAPS */}
          <div className="grid gap-5 md:hidden">
            {[...grupos].map(([uaps, itens]) => (
              <section key={uaps}>
                <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-[0.08em] text-accent">{uaps}</h2>
                <ul className="m-0 grid list-none gap-2.5 p-0">
                  {itens.map((d) => (
                    <li key={d.id} className="grid gap-3 rounded-[22px] border border-border bg-surface px-4 py-4 shadow-card">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/pacientes/${d.pacientes.id}?aba=clinico`} className="font-bold text-heading">{d.pacientes.nome}</Link>
                        <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">{sigla(d.tipo)}</span>
                      </div>
                      <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                        <div><dt className="text-xs text-muted">Número</dt><dd className="m-0 font-semibold text-heading">{d.numero || "—"}</dd></div>
                        <div><dt className="text-xs text-muted">Confecção</dt><dd className="m-0 font-semibold text-heading">{d.confeccao || "—"}</dd></div>
                        <div><dt className="text-xs text-muted">Troca</dt><dd className="m-0 font-semibold text-heading">{formatarData(d.troca)}</dd></div>
                        <div><dt className="text-xs text-muted">Próxima troca</dt><dd className="m-0"><Proxima d={d} hoje={hoje} /></dd></div>
                      </dl>
                      <Acoes d={d} hoje={hoje} editar={editar} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* Computador: tabela agrupada por UAPS */}
          <div className="hidden overflow-x-auto rounded-[22px] border border-border bg-surface shadow-card md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">
                  <th className="px-5 py-3">Paciente</th>
                  <th className="px-3 py-3">Dispositivo</th>
                  <th className="px-3 py-3">Número</th>
                  <th className="px-3 py-3">Confecção</th>
                  <th className="px-3 py-3">Troca</th>
                  <th className="px-3 py-3">Próxima troca</th>
                  {editar && <th className="px-5 py-3">Ações</th>}
                </tr>
              </thead>
              {[...grupos].map(([uaps, itens]) => (
                <tbody key={uaps}>
                  <tr>
                    <th colSpan={editar ? 7 : 6} className="bg-accent-soft px-5 py-2 text-left text-xs font-bold uppercase tracking-[0.08em] text-accent">{uaps}</th>
                  </tr>
                  {itens.map((d) => (
                    <tr key={d.id} className="border-t border-border transition hover:bg-detail">
                      <td className="px-5 py-3 font-semibold">
                        <Link href={`/pacientes/${d.pacientes.id}?aba=clinico`} className="text-heading hover:text-accent">{d.pacientes.nome}</Link>
                      </td>
                      <td className="px-3 py-3 font-bold text-heading">{sigla(d.tipo)}</td>
                      <td className="px-3 py-3">{d.numero || "—"}</td>
                      <td className="px-3 py-3">{d.confeccao || "—"}</td>
                      <td className="px-3 py-3">{formatarData(d.troca)}</td>
                      <td className="px-3 py-3"><Proxima d={d} hoje={hoje} /></td>
                      {editar && <td className="px-5 py-3"><Acoes d={d} hoje={hoje} editar={editar} /></td>}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </>
      )}
      <p className="m-0 text-xs text-muted">
        “Trocou” registra a troca na data escolhida e calcula a próxima automaticamente (GTT 6 meses, SNG/SNE 3 meses, SVD/cistostomia 1 mês).
        Para outro prazo, use “Editar”. Pacientes com alta, transferidos ou óbito não aparecem aqui.
      </p>
    </div>
  );
}
