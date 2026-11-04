"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  dadosDiarioMes, removerAtendimentoDiario, salvarAtendimentoDiario, salvarDiaDiario, type DadosAtendimento,
} from "../../actions";
import {
  FUNCOES_EQUIPE, PROCEDIMENTOS_DIARIO, PROFISSIONAIS, SINAIS, TURNOS, totais,
  type Atendimento, type DiaDiario, type Equipe, type Turno,
} from "@/lib/diario-opcoes";
import { EQUIPE } from "@/lib/equipe";
import { IconeBaixar } from "../icones";

type Props = {
  data: string; hoje: string; turnoAgora: Turno; nomeMes: string; editar: boolean; faltaMigracao: boolean;
  dia: DiaDiario | null; atendimentos: Atendimento[]; pacientes: { id: number; nome: string; prontuario: string }[];
};

const somarDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const ddmmaaaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const nomeProc = (v: string) => PROCEDIMENTOS_DIARIO.find((p) => p.valor === v)?.rotulo ?? v;

/** Equipe sugerida para um dia ainda não salvo: médico, enfermeiro e fisioterapeuta da EMAD nos dois turnos. */
function equipePadrao(): Equipe {
  const nome = (f: string) => EQUIPE.find(([funcao]) => funcao === f)?.[1] ?? "";
  const turno = { medico: nome("Médico"), enfermeiro: nome("Enfermeiro"), fisioterapeuta: nome("Fisioterapeuta") };
  return { manha: { ...turno }, tarde: { ...turno } };
}
const tecnicos = (EQUIPE.find(([f]) => f === "Técnicos")?.[1] ?? "").split(/,| e /).map((t) => t.trim()).filter(Boolean);

export function PainelDiario({ data, hoje, turnoAgora, nomeMes, editar, faltaMigracao, dia, atendimentos, pacientes }: Props) {
  const router = useRouter();
  const [gerando, setGerando] = useState<"" | "dia" | "mes">("");
  const [erroPdf, setErroPdf] = useState("");
  const [edicao, setEdicao] = useState<Atendimento | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const ir = (d: string) => router.push(d === hoje ? "/diario" : `/diario?data=${d}`);

  async function pdf(tipo: "dia" | "mes") {
    setErroPdf("");
    setGerando(tipo);
    try {
      const mod = await import("@/lib/diario-pdf");
      if (tipo === "dia") {
        const { doc, nomeArquivo } = await mod.montarDiaPdf(dia, data, atendimentos);
        doc.save(nomeArquivo);
      } else {
        const r = await dadosDiarioMes(data.slice(0, 7));
        if (r.erro || !r.dias || !r.atendimentos) throw new Error(r.erro ?? "sem dados");
        const { doc, nomeArquivo } = await mod.montarMesPdf(data.slice(0, 7), nomeMes, r.dias, r.atendimentos);
        doc.save(nomeArquivo);
      }
    } catch (e) {
      console.error(e);
      setErroPdf("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGerando("");
    }
  }

  function editarAtendimento(a: Atendimento) {
    setEdicao(a);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => ir(somarDias(data, -1))} className="btn-secundario min-h-11 px-4" aria-label="Dia anterior">‹</button>
        <input
          type="date" value={data} max={hoje} onChange={(e) => e.target.value && ir(e.target.value)}
          aria-label="Data" className="campo !w-auto font-bold"
        />
        <button type="button" onClick={() => ir(somarDias(data, 1))} disabled={data >= hoje} className="btn-secundario min-h-11 px-4 disabled:opacity-40" aria-label="Próximo dia">›</button>
        {data !== hoje && <Link href="/diario" className="text-sm font-semibold text-accent underline">Hoje</Link>}
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button type="button" onClick={() => pdf("dia")} disabled={gerando !== ""} className="btn-primario">
            <IconeBaixar /> {gerando === "dia" ? "Gerando…" : "PDF do dia"}
          </button>
          <button type="button" onClick={() => pdf("mes")} disabled={gerando !== ""} className="btn-secundario">
            <IconeBaixar /> {gerando === "mes" ? "Gerando…" : `PDF do mês (${nomeMes.split(" ")[0].toLowerCase()})`}
          </button>
        </div>
      </div>
      {erroPdf && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erroPdf}</p>}
      {faltaMigracao && (
        <p role="alert" className="m-0 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">
          Falta rodar a migração v21 no Supabase para guardar o diário.
        </p>
      )}

      <FormDia key={`dia-${data}`} data={data} dia={dia} editar={editar} />

      {TURNOS.map((t) => (
        <ListaTurno
          key={t.valor} turno={t.valor} rotulo={t.rotulo} editar={editar}
          lista={atendimentos.filter((a) => a.turno === t.valor)} aoEditar={editarAtendimento}
        />
      ))}

      {editar && (
        <div ref={formRef} className="scroll-mt-4">
          <FormAtendimento
            key={edicao ? `e-${edicao.id}` : `novo-${data}-${atendimentos.length}`}
            data={data} turnoPadrao={turnoAgora} pacientes={pacientes} edicao={edicao} aoTerminar={() => setEdicao(null)}
          />
        </div>
      )}
    </div>
  );
}

function FormDia({ data, dia, editar }: { data: string; dia: DiaDiario | null; editar: boolean }) {
  const [equipe, setEquipe] = useState<Equipe>(dia?.equipe ?? equipePadrao());
  const [anotacoes, setAnotacoes] = useState(dia?.anotacoes ?? "");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const set = (t: Turno, f: string, v: string) => setEquipe((e) => ({ ...e, [t]: { ...e[t], [f]: v } }));

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    iniciar(async () => {
      const r = await salvarDiaDiario(data, equipe, anotacoes);
      setAviso(r.erro ? { ok: false, texto: r.erro } : { ok: true, texto: "Equipe e anotações salvas." });
    });
  }

  return (
    <form onSubmit={salvar} className="cartao grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 text-base font-bold text-heading">Equipe do dia — {ddmmaaaa(data)}</h2>
        {!dia && editar && <span className="text-sm text-muted">Sugestão da equipe: confira e salve.</span>}
      </div>
      <datalist id="lista-tecnicos">{tecnicos.map((t) => <option key={t} value={t} />)}</datalist>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-bold uppercase tracking-[0.08em] text-muted">
              <th className="py-2 pr-3">Equipe</th>
              {TURNOS.map((t) => <th key={t.valor} className="px-1 py-2">{t.rotulo}</th>)}
            </tr>
          </thead>
          <tbody>
            {FUNCOES_EQUIPE.map((f) => (
              <tr key={f.valor} className="border-t border-border">
                <th scope="row" className="whitespace-nowrap py-1.5 pr-3 text-left font-semibold text-heading">{f.rotulo}</th>
                {TURNOS.map((t) => (
                  <td key={t.valor} className="px-1 py-1">
                    <input
                      value={equipe[t.valor]?.[f.valor] ?? ""} onChange={(e) => set(t.valor, f.valor, e.target.value)} readOnly={!editar}
                      list={f.valor.startsWith("tecnico") ? "lista-tecnicos" : undefined} maxLength={120}
                      aria-label={`${f.rotulo} — ${t.rotulo}`} className="campo !rounded-xl !py-2"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <label htmlFor="dia-anot" className="rotulo">Intercorrências / anotações</label>
        <textarea id="dia-anot" value={anotacoes} onChange={(e) => setAnotacoes(e.target.value)} readOnly={!editar} rows={3} maxLength={6000} className="campo" />
      </div>
      {aviso && (
        <p role="status" className={`m-0 rounded-xl px-4 py-3 text-sm font-semibold ${aviso.ok ? "bg-success-soft text-success-strong" : "bg-danger-soft text-danger-strong"}`}>{aviso.texto}</p>
      )}
      {editar && <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>{pendente ? "Salvando…" : "Salvar equipe e anotações"}</button>}
    </form>
  );
}

function ListaTurno({ turno, rotulo, lista, editar, aoEditar }: {
  turno: Turno; rotulo: string; lista: Atendimento[]; editar: boolean; aoEditar: (a: Atendimento) => void;
}) {
  const t = totais(lista);
  const procUsados = PROCEDIMENTOS_DIARIO.filter((p) => t.proc[p.valor] > 0);
  return (
    <section className="grid gap-3" aria-label={`Atendimentos da ${rotulo.toLowerCase()}`}>
      <h2 className="m-0 px-1 text-lg font-bold text-heading">
        {rotulo} <span className="text-sm font-medium text-muted">({lista.length} {lista.length === 1 ? "atendimento" : "atendimentos"})</span>
      </h2>
      {lista.length === 0 ? (
        <p className="cartao m-0 text-center text-sm text-muted">Nenhum atendimento registrado na {rotulo.toLowerCase()}.</p>
      ) : (
        <ol className="m-0 grid list-none gap-2 p-0">
          {lista.map((a, i) => <LinhaAtendimento key={a.id} a={a} n={i + 1} editar={editar} aoEditar={aoEditar} turno={turno} />)}
        </ol>
      )}
      {lista.length > 0 && (
        <p className="m-0 rounded-2xl bg-detail px-4 py-3 text-sm text-heading">
          <strong>Total da {rotulo.toLowerCase()}:</strong> {t.atendimentos} atendimento(s)
          {PROFISSIONAIS.map((p) => (t.prof[p.valor] ? ` · ${p.valor}: ${t.prof[p.valor]}` : "")).join("")}
          {procUsados.length > 0 && <> · {procUsados.map((p) => `${p.rotulo}: ${t.proc[p.valor]}`).join(" · ")}</>}
        </p>
      )}
    </section>
  );
}

function LinhaAtendimento({ a, n, editar, aoEditar }: { a: Atendimento; n: number; editar: boolean; aoEditar: (a: Atendimento) => void; turno: Turno }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const sinais = SINAIS.map((s) => [s.rotulo, a[s.valor]] as const).filter(([, v]) => v);
  function remover() {
    if (!window.confirm(`Remover o atendimento de ${a.paciente}?`)) return;
    setErro("");
    iniciar(async () => {
      const r = await removerAtendimentoDiario(a.id);
      if (r.erro) setErro(r.erro);
    });
  }
  return (
    <li className={`cartao grid gap-2 ${pendente ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="m-0 font-bold text-heading">
          <span className="mr-2 text-muted">{n}.</span>
          {a.pacienteId ? <Link href={`/pacientes/${a.pacienteId}`} className="hover:underline">{a.paciente}</Link> : a.paciente}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {a.profissionais.map((p) => <span key={p} className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">{p}</span>)}
        </div>
      </div>
      {sinais.length > 0 && (
        <p className="m-0 text-sm text-heading">{sinais.map(([r, v]) => <span key={r} className="mr-3"><strong>{r}:</strong> {v}</span>)}</p>
      )}
      {a.procedimentos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {a.procedimentos.map((p) => <span key={p} className="rounded-lg bg-detail px-2 py-0.5 text-xs font-semibold text-heading">{nomeProc(p)}</span>)}
        </div>
      )}
      {editar && (
        <div className="flex gap-4 text-sm">
          <button type="button" onClick={() => aoEditar(a)} className="font-semibold text-accent underline">Corrigir</button>
          <button type="button" onClick={remover} disabled={pendente} className="font-semibold text-muted underline">Remover</button>
          {erro && <span className="font-semibold text-danger-strong">{erro}</span>}
        </div>
      )}
    </li>
  );
}

function FormAtendimento({ data, turnoPadrao, pacientes, edicao, aoTerminar }: {
  data: string; turnoPadrao: Turno; pacientes: Props["pacientes"]; edicao: Atendimento | null; aoTerminar: () => void;
}) {
  const [turno, setTurno] = useState<Turno>(edicao?.turno ?? turnoPadrao);
  const [paciente, setPaciente] = useState(edicao ? (edicao.pacienteId ? String(edicao.pacienteId) : "outro") : "");
  const [nomeOutro, setNomeOutro] = useState(edicao && !edicao.pacienteId ? edicao.paciente : "");
  const [sinais, setSinais] = useState<Record<string, string>>(Object.fromEntries(SINAIS.map((s) => [s.valor, edicao?.[s.valor] ?? ""])));
  const [prof, setProf] = useState<string[]>(edicao?.profissionais ?? []);
  const [proc, setProc] = useState<string[]>(edicao?.procedimentos ?? []);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const alternar = (lista: string[], v: string) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    const d: DadosAtendimento = {
      data, turno, pacienteId: paciente && paciente !== "outro" ? Number(paciente) : null,
      pacienteNome: paciente === "outro" ? nomeOutro : "", sinais, profissionais: prof, procedimentos: proc,
    };
    iniciar(async () => {
      const r = await salvarAtendimentoDiario(edicao?.id ?? null, d);
      if (r.erro) setAviso({ ok: false, texto: r.erro });
      else aoTerminar();
    });
  }

  const chip = (ativo: boolean) =>
    `min-h-10 rounded-full border px-3.5 text-sm font-semibold ${ativo ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted"}`;

  return (
    <form onSubmit={salvar} className="cartao grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-base font-bold text-heading">{edicao ? `Corrigir atendimento de ${edicao.paciente}` : "Registrar atendimento"}</h2>
        {edicao && <button type="button" onClick={aoTerminar} className="text-sm font-semibold text-muted underline">Cancelar correção</button>}
      </div>
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div>
          <span className="rotulo">Turno</span>
          <div role="radiogroup" aria-label="Turno" className="flex gap-2">
            {TURNOS.map((t) => (
              <button key={t.valor} type="button" role="radio" aria-checked={turno === t.valor} onClick={() => setTurno(t.valor)} className={chip(turno === t.valor)}>
                {t.rotulo}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <label htmlFor="at-pac" className="rotulo !mb-0">Paciente</label>
          <select id="at-pac" value={paciente} onChange={(e) => setPaciente(e.target.value)} required className="campo">
            <option value="">Escolha o paciente…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
            <option value="outro">Outro paciente (não cadastrado, de outra EMAD, UAPS…)</option>
          </select>
          {paciente === "outro" && (
            <input value={nomeOutro} onChange={(e) => setNomeOutro(e.target.value)} required maxLength={120} placeholder="Nome do paciente" aria-label="Nome do paciente" className="campo" />
          )}
        </div>
      </div>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="rotulo">Sinais vitais</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {SINAIS.map((s) => (
            <div key={s.valor}>
              <label htmlFor={`at-${s.valor}`} className="mb-1 block text-xs font-bold text-muted">{s.rotulo}</label>
              <input
                id={`at-${s.valor}`} value={sinais[s.valor]} onChange={(e) => setSinais((v) => ({ ...v, [s.valor]: e.target.value }))}
                placeholder={s.ph} inputMode={s.valor === "pa" ? "text" : "decimal"} maxLength={s.valor === "pa" ? 20 : 10} className="campo !py-2"
              />
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="rotulo">Profissionais no atendimento</legend>
        <div className="flex flex-wrap gap-2">
          {PROFISSIONAIS.map((p) => (
            <button key={p.valor} type="button" aria-pressed={prof.includes(p.valor)} onClick={() => setProf((l) => alternar(l, p.valor))} className={chip(prof.includes(p.valor))}>
              {p.valor} · {p.rotulo}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="rotulo">Procedimentos realizados</legend>
        <div className="flex flex-wrap gap-2">
          {PROCEDIMENTOS_DIARIO.map((p) => (
            <button key={p.valor} type="button" aria-pressed={proc.includes(p.valor)} onClick={() => setProc((l) => alternar(l, p.valor))} className={chip(proc.includes(p.valor))}>
              {p.rotulo}
            </button>
          ))}
        </div>
      </fieldset>
      {aviso && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{aviso.texto}</p>}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>
        {pendente ? "Salvando…" : edicao ? "Salvar correção" : "Registrar atendimento"}
      </button>
    </form>
  );
}
