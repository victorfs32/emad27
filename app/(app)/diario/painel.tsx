"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { dadosDiarioMes, salvarFolhaDiario, type LinhaFolha } from "../../actions";
import {
  FUNCOES_EQUIPE, PROCEDIMENTOS_DIARIO, PROFISSIONAIS, SINAIS, TURNOS, totais,
  type Atendimento, type DiaDiario, type Equipe, type Turno,
} from "@/lib/diario-opcoes";
import { EQUIPE } from "@/lib/equipe";
import { IconeBaixar } from "../icones";

type Paciente = { id: number; nome: string; prontuario: string };
type Props = {
  data: string; hoje: string; turnoAgora: Turno; nomeMes: string; editar: boolean; faltaMigracao: boolean;
  dia: DiaDiario | null; atendimentos: Atendimento[]; pacientes: Paciente[];
};

/** Uma linha da folha, como na tela (o paciente é digitado; se bater com um nome do cadastro, fica ligado a ele). */
type Linha = { chave: string; id: number | null; turno: Turno; paciente: string; sinais: Record<string, string>; prof: string[]; proc: string[] };

const LINHAS_POR_TURNO = 9; // como na folha de papel
const somarDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const ddmmaaaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const chave = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
let contador = 0;
const novaChave = () => `n${++contador}`;

function equipePadrao(): Equipe {
  const nome = (f: string) => EQUIPE.find(([funcao]) => funcao === f)?.[1] ?? "";
  const turno = { medico: nome("Médico"), enfermeiro: nome("Enfermeiro"), fisioterapeuta: nome("Fisioterapeuta") };
  return { manha: { ...turno }, tarde: { ...turno } };
}
const tecnicos = (EQUIPE.find(([f]) => f === "Técnicos")?.[1] ?? "").split(/,| e /).map((t) => t.trim()).filter(Boolean);

const linhaVazia = (turno: Turno): Linha => ({ chave: novaChave(), id: null, turno, paciente: "", sinais: {}, prof: [], proc: [] });

/** Linhas salvas de cada turno, completadas com linhas em branco até 9 (como na folha). */
function linhasIniciais(atendimentos: Atendimento[]): Linha[] {
  return TURNOS.flatMap((t) => {
    const salvas: Linha[] = atendimentos.filter((a) => a.turno === t.valor).map((a) => ({
      chave: `a${a.id}`, id: a.id, turno: t.valor, paciente: a.paciente,
      sinais: Object.fromEntries(SINAIS.map((s) => [s.valor, a[s.valor] ?? ""])), prof: a.profissionais, proc: a.procedimentos,
    }));
    const vazias = Array.from({ length: Math.max(1, LINHAS_POR_TURNO - salvas.length) }, () => linhaVazia(t.valor));
    return [...salvas, ...vazias];
  });
}

export function PainelDiario({ data, hoje, nomeMes, editar, faltaMigracao, dia, atendimentos, pacientes }: Props) {
  const router = useRouter();
  const [equipe, setEquipe] = useState<Equipe>(dia?.equipe ?? equipePadrao());
  const [anotacoes, setAnotacoes] = useState(dia?.anotacoes ?? "");
  const [linhas, setLinhas] = useState<Linha[]>(() => linhasIniciais(atendimentos));
  const [alterado, setAlterado] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string; lista?: string[] } | null>(null);
  const [gerando, setGerando] = useState<"" | "dia" | "mes">("");
  const [pendente, iniciar] = useTransition();

  const porNome = useMemo(() => new Map(pacientes.map((p) => [chave(p.nome), p])), [pacientes]);

  // Avisa antes de sair da página com a folha alterada e não salva.
  useEffect(() => {
    if (!alterado) return;
    const sair = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", sair);
    return () => window.removeEventListener("beforeunload", sair);
  }, [alterado]);

  const mudar = (fn: () => void) => {
    fn();
    setAlterado(true);
    setAviso(null);
  };
  const setLinha = (k: string, patch: Partial<Linha>) => mudar(() => setLinhas((ls) => ls.map((l) => (l.chave === k ? { ...l, ...patch } : l))));
  const alternar = (lista: string[], v: string) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  function ir(d: string) {
    if (alterado && !window.confirm("A folha tem alterações não salvas. Sair mesmo assim?")) return;
    router.push(d === hoje ? "/diario" : `/diario?data=${d}`);
  }

  function salvar() {
    setAviso(null);
    const envio: LinhaFolha[] = linhas.filter((l) => l.id || l.paciente.trim()).map((l) => {
      const p = porNome.get(chave(l.paciente));
      return {
        id: l.id, data, turno: l.turno, pacienteId: p?.id ?? null, pacienteNome: p ? "" : l.paciente.trim(),
        sinais: l.sinais, profissionais: l.prof, procedimentos: l.proc,
      };
    });
    iniciar(async () => {
      const r = await salvarFolhaDiario(data, equipe, anotacoes, envio);
      if (r.erro) setAviso({ ok: false, texto: r.erro, lista: r.erros });
      else {
        setAlterado(false);
        setAviso({ ok: true, texto: "Folha salva." });
        router.refresh();
      }
    });
  }

  async function pdf(tipo: "dia" | "mes") {
    if (alterado && !window.confirm("A folha tem alterações não salvas: o PDF sai com o que já está salvo. Continuar?")) return;
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
      setAviso({ ok: false, texto: "Não foi possível gerar o PDF. Tente novamente." });
    } finally {
      setGerando("");
    }
  }

  const celula = "border border-[#333] p-0";
  const entrada = "h-8 w-full bg-transparent px-1 text-center text-[13px] text-heading outline-none focus:bg-accent-soft disabled:cursor-default";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => ir(somarDias(data, -1))} className="btn-secundario min-h-11 px-4" aria-label="Dia anterior">‹</button>
        <input type="date" value={data} max={hoje} onChange={(e) => e.target.value && ir(e.target.value)} aria-label="Data" className="campo !w-auto font-bold" />
        <button type="button" onClick={() => ir(somarDias(data, 1))} disabled={data >= hoje} className="btn-secundario min-h-11 px-4 disabled:opacity-40" aria-label="Próximo dia">›</button>
        {data !== hoje && <Link href="/diario" className="text-sm font-semibold text-accent underline">Hoje</Link>}
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button type="button" onClick={() => pdf("dia")} disabled={gerando !== ""} className="btn-secundario">
            <IconeBaixar /> {gerando === "dia" ? "Gerando…" : "PDF do dia"}
          </button>
          <button type="button" onClick={() => pdf("mes")} disabled={gerando !== ""} className="btn-secundario">
            <IconeBaixar /> {gerando === "mes" ? "Gerando…" : `PDF do mês (${nomeMes.split(" ")[0].toLowerCase()})`}
          </button>
        </div>
      </div>
      {faltaMigracao && (
        <p role="alert" className="m-0 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">Falta rodar a migração v21 no Supabase para guardar o diário.</p>
      )}

      {/* A folha */}
      <div className="overflow-x-auto rounded-[18px] border border-border bg-white p-3 shadow-card">
        <div className="min-w-[1180px] text-[#1a1a1a]">
          <div className="flex items-end justify-between border border-[#333] px-2 py-1.5">
            <div>
              <p className="m-0 text-base font-extrabold">OCORRÊNCIA - EMAD 27</p>
              <p className="m-0 text-[10px] font-bold leading-tight">
                PREFEITURA MUNICIPAL DE FORTALEZA · SECRETARIA MUNICIPAL DE SAÚDE<br />
                EQUIPE MULTIPROFISSIONAL DE ATENDIMENTO DOMICILIAR - EMAD · EQUIPE MULTIPROFISSIONAL DE APOIO - EMAP
              </p>
            </div>
            <p className="m-0 text-base font-extrabold">DATA: {ddmmaaaa(data)}</p>
          </div>

          {/* equipe */}
          <datalist id="lista-tecnicos">{tecnicos.map((t) => <option key={t} value={t} />)}</datalist>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#d9d9d9] font-bold">
                <th className="w-40 border border-[#333] px-2 py-1 text-left">EQUIPE</th>
                {TURNOS.map((t) => <th key={t.valor} className="border border-[#333] px-2 py-1">{t.rotulo.toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
              {FUNCOES_EQUIPE.map((f) => (
                <tr key={f.valor}>
                  <th scope="row" className="border border-[#333] px-2 text-left font-bold">{f.rotulo.toUpperCase()}</th>
                  {TURNOS.map((t) => (
                    <td key={t.valor} className={celula}>
                      <input
                        value={equipe[t.valor]?.[f.valor] ?? ""} disabled={!editar} maxLength={120}
                        list={f.valor.startsWith("tecnico") ? "lista-tecnicos" : undefined} aria-label={`${f.rotulo} — ${t.rotulo}`}
                        onChange={(e) => mudar(() => setEquipe((q) => ({ ...q, [t.valor]: { ...q[t.valor], [f.valor]: e.target.value } })))}
                        className={`${entrada} !text-left`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* registro diário de atendimentos */}
          <datalist id="lista-pacientes">{pacientes.map((p) => <option key={p.id} value={p.nome}>Pront. {p.prontuario}</option>)}</datalist>
          <table className="mt-2 w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#d9d9d9] font-bold">
                <th colSpan={2} className="border border-[#333] px-2 py-1" />
                <th colSpan={SINAIS.length} className="border border-[#333] px-2 py-1 text-center">PA/FC/FR/TA/DX/SPO2</th>
                <th colSpan={PROFISSIONAIS.length} className="border border-[#333] px-1 py-1 text-center text-[11px]">PROFISSIONAIS</th>
                <th colSpan={PROCEDIMENTOS_DIARIO.length} className="border border-[#333] px-1 py-1 text-center text-[11px]">PROCEDIMENTOS</th>
              </tr>
              <tr className="bg-[#d9d9d9] align-bottom font-bold">
                <th className="w-7 border border-[#333]">Nº</th>
                <th className="w-[240px] border border-[#333] px-2 text-left">PACIENTE</th>
                {SINAIS.map((s) => <th key={s.valor} className={`border border-[#333] ${s.valor === "pa" ? "w-[70px]" : "w-[44px]"}`}>{s.rotulo}</th>)}
                {PROFISSIONAIS.map((p) => <th key={p.valor} title={p.rotulo} className="w-[26px] border border-[#333] text-[11px]">{p.valor}</th>)}
                {PROCEDIMENTOS_DIARIO.map((p) => (
                  <th key={p.valor} className="h-40 w-[24px] border border-[#333] p-0.5 align-bottom">
                    <span className="inline-block whitespace-nowrap text-[10.5px] leading-none [writing-mode:vertical-rl] rotate-180">{p.rotulo}</span>
                  </th>
                ))}
              </tr>
            </thead>
            {TURNOS.map((t) => {
              const doTurno = linhas.filter((l) => l.turno === t.valor);
              const tt = totais(doTurno.filter((l) => l.paciente.trim()).map((l) => ({ profissionais: l.prof, procedimentos: l.proc })));
              return (
                <tbody key={t.valor}>
                  <tr className="bg-[#d9d9d9]">
                    <th colSpan={2 + SINAIS.length + PROFISSIONAIS.length + PROCEDIMENTOS_DIARIO.length} className="border border-[#333] py-1 text-center font-bold">
                      {t.rotulo.toUpperCase()}
                    </th>
                  </tr>
                  {doTurno.map((l, i) => {
                    const ligado = porNome.get(chave(l.paciente));
                    return (
                      <tr key={l.chave} className="hover:bg-[#f4f8f7]">
                        <td className="border border-[#333] text-center font-bold">{i + 1}</td>
                        <td className={celula}>
                          <input
                            value={l.paciente} disabled={!editar} list="lista-pacientes" maxLength={120} placeholder={editar ? "Nome do paciente" : ""}
                            onChange={(e) => setLinha(l.chave, { paciente: e.target.value })} aria-label={`${t.rotulo}, linha ${i + 1}: paciente`}
                            title={ligado ? `Paciente do cadastro (pront. ${ligado.prontuario})` : l.paciente ? "Paciente fora do cadastro" : undefined}
                            className={`${entrada} !text-left ${l.paciente && !ligado ? "italic" : ""}`}
                          />
                        </td>
                        {SINAIS.map((s) => (
                          <td key={s.valor} className={celula}>
                            <input
                              value={l.sinais[s.valor] ?? ""} disabled={!editar} maxLength={s.valor === "pa" ? 20 : 10}
                              inputMode={s.valor === "pa" ? "text" : "decimal"} aria-label={`${t.rotulo}, linha ${i + 1}: ${s.rotulo}`}
                              onChange={(e) => setLinha(l.chave, { sinais: { ...l.sinais, [s.valor]: e.target.value } })}
                              className={entrada}
                            />
                          </td>
                        ))}
                        {PROFISSIONAIS.map((p) => (
                          <td key={p.valor} className="border border-[#333] text-center">
                            <input
                              type="checkbox" checked={l.prof.includes(p.valor)} disabled={!editar} aria-label={`${t.rotulo}, linha ${i + 1}: ${p.rotulo}`}
                              onChange={() => setLinha(l.chave, { prof: alternar(l.prof, p.valor) })} className="h-4 w-4 accent-accent"
                            />
                          </td>
                        ))}
                        {PROCEDIMENTOS_DIARIO.map((p) => (
                          <td key={p.valor} className="border border-[#333] text-center">
                            <input
                              type="checkbox" checked={l.proc.includes(p.valor)} disabled={!editar} aria-label={`${t.rotulo}, linha ${i + 1}: ${p.rotulo}`}
                              onChange={() => setLinha(l.chave, { proc: alternar(l.proc, p.valor) })} className="h-4 w-4 accent-accent"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  <tr className="bg-[#a6a6a6] font-bold">
                    <td colSpan={2 + SINAIS.length} className="border border-[#333] px-2 py-1 text-right">
                      {editar && (
                        <button
                          type="button" onClick={() => mudar(() => setLinhas((ls) => [...ls, linhaVazia(t.valor)]))}
                          className="float-left rounded bg-white px-2 text-xs font-semibold text-accent"
                        >
                          + linha
                        </button>
                      )}
                      TOTAL: {tt.atendimentos}
                    </td>
                    {PROFISSIONAIS.map((p) => <td key={p.valor} className="border border-[#333] text-center">{tt.prof[p.valor] || ""}</td>)}
                    {PROCEDIMENTOS_DIARIO.map((p) => <td key={p.valor} className="border border-[#333] text-center">{tt.proc[p.valor] || ""}</td>)}
                  </tr>
                </tbody>
              );
            })}
          </table>

          <div className="mt-2 border border-[#333]">
            <p className="m-0 border-b border-[#333] bg-[#d9d9d9] px-2 py-1 text-[13px] font-bold">INTERCORRÊNCIAS/ANOTAÇÕES:</p>
            <textarea
              value={anotacoes} disabled={!editar} rows={4} maxLength={6000} aria-label="Intercorrências e anotações"
              onChange={(e) => mudar(() => setAnotacoes(e.target.value))}
              className="block w-full resize-y bg-transparent p-2 text-[13px] text-heading outline-none focus:bg-accent-soft"
            />
          </div>
        </div>
      </div>

      <p className="m-0 text-sm text-muted">
        Digite o nome do paciente: ao escolher um nome da lista, o atendimento fica ligado ao cadastro e a visita do dia é registrada sozinha.
        Nome fora do cadastro (outra EMAD, UAPS) aparece em itálico. Para apagar uma linha já salva, apague o nome do paciente e salve.
      </p>

      {aviso && (
        <div role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${aviso.ok ? "bg-success-soft text-success-strong" : "bg-danger-soft text-danger-strong"}`}>
          {aviso.texto}
          {aviso.lista && <ul className="m-0 mt-1 pl-5 font-normal">{aviso.lista.map((e) => <li key={e}>{e}</li>)}</ul>}
        </div>
      )}

      {editar && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-surface/95 p-3 shadow-card-md backdrop-blur">
          <button type="button" onClick={salvar} disabled={pendente || !alterado} className="btn-primario">
            {pendente ? "Salvando…" : "Salvar folha"}
          </button>
          <span className="text-sm text-muted">{alterado ? "Há alterações não salvas." : "Tudo salvo."}</span>
        </div>
      )}
    </div>
  );
}
