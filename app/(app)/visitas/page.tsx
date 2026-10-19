import Link from "next/link";
import { connection } from "next/server";
import { exigirUsuario } from "@/lib/auth";
import { listarBairros, listarControleVisitas } from "@/lib/pacientes";
import { deslocarMes, hojeISO, limitesDoMes, mesValido, nomeDoMes } from "@/lib/opcoes";
import { IconeBusca, IconeVisita } from "../icones";
import { GradeVisitas, type DiaGrade, type GrupoGrade } from "./grade-visitas";

export default async function ControleVisitas({ searchParams }: PageProps<"/visitas">) {
  await connection();
  const sp = await searchParams;
  const um = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const hoje = hojeISO();
  const mes = mesValido(sp.mes) ? (sp.mes as string) : hoje.slice(0, 7);
  const minhas = um("quem") === "minhas";
  const q = um("q").toLowerCase();
  const bairro = um("bairro");
  const sem = um("sem") === "1";

  const usuario = await exigirUsuario();
  const [todas, bairros] = await Promise.all([listarControleVisitas(mes, minhas ? usuario.id : null), listarBairros()]);
  const editar = usuario.perms.editar;

  const totalVisitas = todas.reduce((s, l) => s + l.visitas.length, 0);
  const visitados = todas.filter((l) => l.visitas.length > 0).length;
  const semVisita = todas.length - visitados;

  const linhas = todas
    .filter((l) => !q || l.nome.toLowerCase().includes(q) || l.prontuario.toLowerCase().includes(q))
    .filter((l) => !bairro || l.bairro === bairro)
    .filter((l) => !sem || l.visitas.length === 0)
    .sort((a, b) => (a.uaps ?? "~").localeCompare(b.uaps ?? "~", "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"));

  // Dias do mês (com dia da semana) e agrupamento por UAPS para a grade.
  const { inicio, fim } = limitesDoMes(mes);
  const SEM = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const dias: DiaGrade[] = [];
  for (let d = new Date(inicio + "T00:00:00Z"); d < new Date(fim + "T00:00:00Z"); d = new Date(d.getTime() + 86400000)) {
    const dow = d.getUTCDay();
    dias.push({ iso: d.toISOString().slice(0, 10), n: String(d.getUTCDate()).padStart(2, "0"), sem: SEM[dow], fimDeSemana: dow === 0 || dow === 6 });
  }
  const mapaGrupos = new Map<string, GrupoGrade>();
  for (const l of linhas) {
    const k = l.uaps ?? "UAPS não informada";
    const g = mapaGrupos.get(k) ?? { uaps: k, pacientes: [] };
    const porDia: Record<string, { id: number; autor: string }[]> = {};
    for (const v of l.visitas) (porDia[v.data] ??= []).push({ id: v.id, autor: v.autor });
    g.pacientes.push({ id: l.id, nome: l.nome, prontuario: l.prontuario, total: l.visitas.length, porDia });
    mapaGrupos.set(k, g);
  }
  const grupos = [...mapaGrupos.values()];

  const url = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    const base: Record<string, string> = { mes, quem: minhas ? "minhas" : "", q: um("q"), bairro, sem: sem ? "1" : "", ...extra };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    return `/visitas?${p}`;
  };
  const eMesAtual = mes === hoje.slice(0, 7);
  const chip = (ativo: boolean) =>
    `whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${ativo ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:text-heading"}`;

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">Visitas domiciliares</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Controle de visitas<span className="text-accent">.</span></h1>
        <p className="m-0 mt-1 text-sm text-muted">
          Clique no dia para marcar a visita (X); clique no X para desfazer. Cada visita entra também no acompanhamento da ficha.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={url({ mes: deslocarMes(mes, -1) })} className="btn-secundario !min-h-11 !px-4" aria-label="Mês anterior">←</Link>
          <strong className="min-w-44 text-center text-lg text-heading">{nomeDoMes(mes)}</strong>
          <Link href={url({ mes: deslocarMes(mes, 1) })} className="btn-secundario !min-h-11 !px-4" aria-label="Próximo mês">→</Link>
          {!eMesAtual && <Link href={url({ mes: hoje.slice(0, 7) })} className="text-sm font-semibold text-accent hover:underline">Mês atual</Link>}
        </div>
        <div className="flex gap-2">
          <Link href={url({ quem: "" })} className={chip(!minhas)}>Toda a equipe</Link>
          <Link href={url({ quem: "minhas" })} className={chip(minhas)}>Só minhas visitas</Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo do mês">
        {[
          ["Visitas no mês", String(totalVisitas), "text-heading"],
          ["Pacientes visitados", `${visitados} de ${todas.length}`, "text-heading"],
          ["Sem visita no mês", String(semVisita), semVisita ? "text-danger-strong" : "text-heading"],
          ["Média por paciente", todas.length ? (totalVisitas / todas.length).toFixed(1).replace(".", ",") : "0", "text-heading"],
        ].map(([r, v, cor]) => (
          <div key={r} className="rounded-[22px] border border-border bg-surface p-4 shadow-card">
            <p className="m-0 text-xs font-semibold text-muted sm:text-[13px]">{r}</p>
            <p className={`mb-0 mt-2 text-[30px] font-extrabold leading-none tracking-[-0.03em] ${cor}`}>{v}</p>
          </div>
        ))}
      </section>

      <form role="search" className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input type="hidden" name="mes" value={mes} />
        {minhas && <input type="hidden" name="quem" value="minhas" />}
        <label className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3.5 focus-within:border-accent">
          <IconeBusca className="h-[18px] w-[18px] text-muted" />
          <input name="q" defaultValue={um("q")} placeholder="Buscar paciente ou prontuário…" aria-label="Buscar" className="h-12 w-full bg-transparent text-[15px] text-heading outline-none placeholder:text-muted/70" />
        </label>
        <select name="bairro" defaultValue={bairro} aria-label="Bairro" className="campo sm:w-auto">
          <option value="">Todos os bairros</option>
          {bairros.map((b) => <option key={b}>{b}</option>)}
        </select>
        <label className="flex min-h-12 items-center gap-2 px-1 text-sm font-semibold text-heading">
          <input type="checkbox" name="sem" value="1" defaultChecked={sem} className="h-5 w-5 accent-[#1d6f57]" /> Só sem visita
        </label>
        <button className="btn-primario">Filtrar</button>
      </form>

      {linhas.length === 0 ? (
        <div className="rounded-[22px] border border-border bg-surface px-5 py-12 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><IconeVisita className="h-7 w-7" /></span>
          <p className="mb-0 mt-3 font-bold text-heading">{todas.length === 0 ? "Nenhum paciente em acompanhamento" : "Nenhum paciente com esses filtros"}</p>
        </div>
      ) : (
        <>
          <GradeVisitas grupos={grupos} dias={dias} hoje={hoje} editar={editar} />
        </>
      )}
      <p className="m-0 text-xs text-muted">
        Total de visitas do mês e por paciente; fins de semana em cinza e o dia de hoje em destaque. Pacientes com alta, transferidos ou óbito não aparecem.
        {minhas ? " Mostrando só as visitas lançadas por você." : ""}
      </p>
    </div>
  );
}
