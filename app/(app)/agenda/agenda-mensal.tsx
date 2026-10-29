"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { registrarVisitaDia } from "../../actions";
import { gerarAgenda, type DiaAgenda, type PacienteAgenda, type VisitaAgenda } from "@/lib/agenda";
import { IconeBaixar } from "../icones";

const NOMES_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_ESCOLHA = [[1, "Seg"], [2, "Ter"], [3, "Qua"], [4, "Qui"], [5, "Sex"], [6, "Sáb"], [0, "Dom"]] as const;

type Config = { meta: number; maxPorDia: number; diasSemana: number[]; folgas: string[] };
type Props = {
  pacientes: PacienteAgenda[]; visitas: VisitaAgenda[]; mes: string; nomeMes: string; anterior: string; proximo: string;
  hoje: string; editar: boolean; inicial: Config;
};

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const agora = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

/** Endereço da agenda de um mês com os ajustes (os dias sem atendimento valem só para o mês em que foram marcados). */
function endereco(mes: string, c: Config, comFolgas: boolean) {
  const p = new URLSearchParams({ mes, meta: String(c.meta), max: String(c.maxPorDia), dias: [...c.diasSemana].sort().join("") });
  if (comFolgas && c.folgas.length) p.set("folgas", [...c.folgas].sort().join(","));
  return `/agenda?${p}`;
}

export function AgendaMensal({ pacientes, visitas, mes, nomeMes, anterior, proximo, hoje, editar, inicial }: Props) {
  const [cfg, setCfg] = useState<Config>(inicial);
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState("");
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const agenda = useMemo(() => gerarAgenda(pacientes, visitas, { mes, hoje, ...cfg }), [pacientes, visitas, mes, hoje, cfg]);

  /** Guarda os ajustes no endereço da página (sem recarregar), para manter a agenda ao atualizar ou compartilhar. */
  function mudar(parcial: Partial<Config>) {
    const novo = { ...cfg, ...parcial };
    setCfg(novo);
    window.history.replaceState(null, "", endereco(mes, novo, true));
  }
  const alternarDia = (dow: number) =>
    mudar({ diasSemana: cfg.diasSemana.includes(dow) ? cfg.diasSemana.filter((d) => d !== dow) : [...cfg.diasSemana, dow] });
  const alternarFolga = (iso: string) =>
    mudar({ folgas: cfg.folgas.includes(iso) ? cfg.folgas.filter((d) => d !== iso) : [...cfg.folgas, iso] });

  function registrar(id: number, nome: string) {
    setAviso("");
    iniciar(async () => {
      const r = await registrarVisitaDia(id, hoje);
      if (r.erro) setAviso(`${nome}: ${r.erro}`);
    });
  }

  async function baixarPdf() {
    setAviso("");
    setGerandoPdf(true);
    try {
      const { gerarAgendaPdf } = await import("@/lib/agenda-pdf");
      await gerarAgendaPdf(agenda, { mes, nomeMes, meta: cfg.meta, geradoEm: agora() });
    } catch (e) {
      console.error(e);
      setAviso("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGerandoPdf(false);
    }
  }

  // Semanas (começam na segunda) só com os dias que interessam: de atendimento, marcados sem atendimento ou com visita.
  const semanas = useMemo(() => {
    const lista: DiaAgenda[][] = [];
    for (const d of agenda.dias) {
      if (!(d.util || d.folga || d.itens.length)) continue;
      const ultima = lista[lista.length - 1];
      const anterior = ultima?.[ultima.length - 1];
      const novaSemana = !anterior || d.dow === 1 || Date.parse(d.iso) - Date.parse(anterior.iso) >= 7 * 86400000 || d.dow < anterior.dow;
      if (novaSemana) lista.push([d]);
      else ultima.push(d);
    }
    return lista;
  }, [agenda]);

  const porDia = agenda.diasRestantes ? agenda.previstas / agenda.diasRestantes : 0;

  return (
    <div className="grid gap-6">
      <nav className="flex items-center gap-2" aria-label="Mês">
        <Link href={endereco(anterior, cfg, false)} className="btn-secundario min-h-11 px-4" aria-label="Mês anterior">‹</Link>
        <span className="min-w-44 text-center text-lg font-bold text-heading">{nomeMes}</span>
        <Link href={endereco(proximo, cfg, false)} className="btn-secundario min-h-11 px-4" aria-label="Próximo mês">›</Link>
      </nav>

      <section className="cartao grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[repeat(2,minmax(0,12rem))_1fr]">
          <div>
            <label htmlFor="ag-meta" className="rotulo">Meta de visitas no mês</label>
            <input
              id="ag-meta" type="number" inputMode="numeric" min={0} max={600} value={cfg.meta}
              onChange={(e) => mudar({ meta: Math.min(600, Math.max(0, Number(e.target.value) || 0)) })}
              className="campo"
            />
          </div>
          <div>
            <label htmlFor="ag-max" className="rotulo">Máximo por dia</label>
            <input
              id="ag-max" type="number" inputMode="numeric" min={1} max={20} value={cfg.maxPorDia}
              onChange={(e) => mudar({ maxPorDia: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
              className="campo"
            />
          </div>
          <fieldset className="m-0 border-0 p-0">
            <legend className="rotulo">Dias de atendimento</legend>
            <div className="flex flex-wrap gap-2">
              {DIAS_ESCOLHA.map(([dow, rotulo]) => {
                const ativo = cfg.diasSemana.includes(dow);
                return (
                  <button
                    key={dow} type="button" onClick={() => alternarDia(dow)} aria-pressed={ativo}
                    className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${ativo ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted"}`}
                  >
                    {rotulo}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
        <p className="m-0 text-sm text-muted">
          Feriado, folga ou reunião? Toque em <strong>“Sem atendimento”</strong> no dia: os pacientes dele passam para os dias seguintes.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Meta", cfg.meta],
          ["Realizadas", agenda.realizadas],
          ["Previstas", agenda.previstas],
          ["Dias de atendimento", agenda.diasAtendimento],
          ["Por dia (de hoje em diante)", porDia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="cartao grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{rotulo}</span>
            <strong className="text-2xl text-heading">{valor}</strong>
          </div>
        ))}
      </section>

      {agenda.faltamParaMeta > 0 && (
        <p role="status" className="m-0 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">
          Com {cfg.maxPorDia} visitas por dia no máximo, faltam {agenda.faltamParaMeta} para chegar à meta. Aumente o máximo por dia ou os dias de atendimento.
        </p>
      )}
      {agenda.pacientes === 0 && (
        <p className="cartao m-0 text-center text-sm text-muted">Nenhum paciente ativo para agendar.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={baixarPdf} disabled={gerandoPdf} className="btn-primario">
          <IconeBaixar /> {gerandoPdf ? "Gerando PDF…" : "Baixar agenda em PDF (para a gestão)"}
        </button>
        <span className="text-sm text-muted">{agenda.pacientes} pacientes ativos · cada um recebe em média {agenda.pacientes ? ((agenda.realizadas + agenda.previstas) / agenda.pacientes).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : 0} visitas no mês</span>
      </div>
      {aviso && <p role="alert" className="m-0 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{aviso}</p>}

      <div className={`grid gap-6 transition ${pendente ? "opacity-60" : ""}`}>
        {semanas.map((dias, i) => {
          const titulo = (
            <>
              Semana {i + 1}{" "}
              <span className="text-[12.5px] font-medium text-muted">
                ({ddmm(dias[0].iso)} a {ddmm(dias[dias.length - 1].iso)} · {dias.reduce((s, d) => s + d.itens.length, 0)} visitas)
              </span>
            </>
          );
          const cartoes = (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
              {dias.map((d) => (
                <CartaoDia key={d.iso} d={d} hoje={hoje} editar={editar} pendente={pendente} alternarFolga={alternarFolga} registrar={registrar} />
              ))}
            </div>
          );
          // Semanas que já terminaram ficam recolhidas (só o que foi realmente visitado).
          return dias[dias.length - 1].passado ? (
            <details key={dias[0].iso} className="grid gap-3">
              <summary className="cursor-pointer px-1 text-base font-bold text-heading">{titulo} <span className="text-sm font-medium text-muted">— já passou</span></summary>
              <div className="mt-3">{cartoes}</div>
            </details>
          ) : (
            <section key={dias[0].iso} className="grid gap-3">
              <h2 className="m-0 px-1 text-base font-bold text-heading">{titulo}</h2>
              {cartoes}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CartaoDia({ d, hoje, editar, pendente, alternarFolga, registrar }: {
  d: DiaAgenda; hoje: string; editar: boolean; pendente: boolean;
  alternarFolga: (iso: string) => void; registrar: (id: number, nome: string) => void;
}) {
  const eHoje = d.iso === hoje;
  return (
    <article className={`cartao grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-3 ${eHoje ? "border-accent" : ""} ${d.folga ? "opacity-70" : ""}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 text-sm font-bold text-heading">
            {NOMES_DIA[d.dow]}, {ddmm(d.iso)}
            {eHoje && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-white">Hoje</span>}
          </p>
          {d.bairros.length && !d.folga ? (
            <p className="m-0 mt-0.5 text-[15px] font-extrabold text-accent">{d.bairros.join(" + ")}</p>
          ) : (
            <p className="m-0 mt-0.5 text-sm font-semibold text-muted">
              {d.folga ? "Sem atendimento" : d.passado ? "Nenhuma visita registrada" : "Nada planejado"}
            </p>
          )}
        </div>
        {!d.passado && (d.util || d.folga) && (
          <button type="button" onClick={() => alternarFolga(d.iso)} className="text-sm font-semibold text-muted underline">
            {d.folga ? "Voltar a atender" : "Sem atendimento"}
          </button>
        )}
      </header>
      {d.itens.length > 0 && (
        <ol className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-2 p-0">
          {d.itens.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-detail px-3 py-2">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-surface text-xs font-bold text-heading">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <Link href={`/pacientes/${p.id}`} className="block font-semibold leading-snug text-heading hover:underline">{p.nome}</Link>
                <small className="block truncate text-muted">
                  {[`Pront. ${p.prontuario}`, `CNS ${p.cns || "não informado"}`, d.bairros.length > 1 ? p.bairro : "", p.endereco].filter(Boolean).join(" · ")}
                </small>
              </span>
              {p.realizada ? (
                <span className="flex-none rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success-strong">Visitado</span>
              ) : eHoje && editar ? (
                <button
                  type="button" disabled={pendente} onClick={() => registrar(p.id, p.nome)}
                  className="flex-none rounded-xl bg-accent px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  Registrar visita
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
