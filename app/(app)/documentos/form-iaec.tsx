"use client";

import { useState, useTransition } from "react";
import { fichaParaDocumento } from "../../actions";
import { GATILHOS, INDICACOES, SECOES, calcularIaec } from "@/lib/iaec-pdf";

type Props = { pacientes: { id: number; nome: string; prontuario: string }[]; hoje: string };

/** IAEC-AD: o médico marca as respostas; os pontos e a modalidade (AD1/AD2/AD3) são calculados sozinhos. */
export function FormIaec({ pacientes, hoje }: Props) {
  const [paciente, setPaciente] = useState("");
  const [data, setData] = useState(hoje);
  const [indicacoes, setIndicacoes] = useState<number[]>([]);
  const [gatilhos, setGatilhos] = useState<string[]>([]);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [pendente, iniciar] = useTransition();

  const resultado = calcularIaec({ indicacoes, gatilhos, respostas });
  const limparResposta = (id: string) => setRespostas((x) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== id)));
  const alternar = <T,>(lista: T[], set: (x: T[]) => void, v: T) => set(lista.includes(v) ? lista.filter((y) => y !== v) : [...lista, v]);

  function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOk("");
    iniciar(async () => {
      try {
        const r = await fichaParaDocumento("iaec_ad", Number(paciente));
        if (r.erro || !r.dados) {
          setErro(r.erro ?? "Não foi possível gerar o documento.");
          return;
        }
        const { gerarIaecPdf } = await import("@/lib/iaec-pdf");
        await gerarIaecPdf({ nome: r.dados.ficha.nome, data, indicacoes, gatilhos, respostas });
        setOk(`IAEC-AD de ${r.dados.ficha.nome} gerado.`);
      } catch (err) {
        console.error(err);
        setErro("Não foi possível gerar o PDF. Tente novamente.");
      }
    });
  }

  const opcaoClasse = (ativo: boolean) =>
    `flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${ativo ? "border-accent bg-accent-soft font-semibold text-heading" : "border-border bg-surface text-muted"}`;

  return (
    <form onSubmit={gerar} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_minmax(0,12rem)]">
        <div>
          <label htmlFor="ia-paciente" className="rotulo">Paciente <span className="text-danger">*</span></label>
          <select id="ia-paciente" value={paciente} onChange={(e) => setPaciente(e.target.value)} required className="campo">
            <option value="">Escolha o paciente…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ia-data" className="rotulo">Data</label>
          <input id="ia-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required className="campo" />
        </div>
      </div>

      <fieldset className="m-0 grid min-w-0 gap-1.5 border-0 p-0">
        <legend className="rotulo p-0">Indicações clínicas mais frequentes para AD2/AD3 (uma ou mais)</legend>
        {INDICACOES.map((t, i) => (
          <label key={i} className={opcaoClasse(indicacoes.includes(i))}>
            <input type="checkbox" checked={indicacoes.includes(i)} onChange={() => alternar(indicacoes, setIndicacoes, i)} className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-accent)]" />
            {t}
          </label>
        ))}
      </fieldset>

      <fieldset className="m-0 grid min-w-0 gap-1.5 border-0 p-0">
        <legend className="rotulo p-0">Indicações clínicas especiais ou gatilhos (já definem AD2 ou AD3)</legend>
        {GATILHOS.map((g) => (
          <label key={g.id} className={opcaoClasse(gatilhos.includes(g.id))}>
            <input type="checkbox" checked={gatilhos.includes(g.id)} onChange={() => alternar(gatilhos, setGatilhos, g.id)} className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-accent)]" />
            {g.texto}
          </label>
        ))}
      </fieldset>

      {SECOES.map((s) => (
        <div key={s.titulo} className="grid gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="m-0 text-sm font-bold uppercase tracking-[0.06em] text-heading">{s.titulo}</h3>
            <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">{resultado.porSecao[s.titulo]} pt</span>
          </div>
          {s.nota && <p className="m-0 text-xs text-muted">{s.nota}</p>}
          {s.grupos.map((g) => (
            <fieldset key={g.id} className="m-0 grid min-w-0 gap-1.5 border-0 p-0">
              <legend className="mb-1 p-0 text-sm font-semibold text-heading">{g.titulo}</legend>
              {g.opcoes.map((op, i) => (
                <label key={i} className={opcaoClasse(respostas[g.id] === i)}>
                  <input
                    type="radio" name={g.id} checked={respostas[g.id] === i}
                    onChange={() => setRespostas((x) => ({ ...x, [g.id]: i }))}
                    onClick={() => respostas[g.id] === i && limparResposta(g.id)}
                    className="mt-0.5 h-4 w-4 flex-none accent-[var(--color-accent)]"
                  />
                  {op.texto} — {op.pontos} {op.pontos === 1 ? "ponto" : "pontos"}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      ))}

      <div className="rounded-2xl bg-accent-soft p-4" role="status" aria-live="polite">
        <p className="m-0 text-sm text-muted">Pontuação final</p>
        <p className="m-0 mt-0.5 text-[28px] font-extrabold leading-none text-heading">{resultado.total} <span className="text-base font-bold text-accent">→ {resultado.modalidade}</span></p>
        {resultado.porGatilho && <p className="mb-0 mt-1.5 text-xs text-muted">Classificado pela indicação clínica especial (gatilho), independente da pontuação.</p>}
      </div>

      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {ok && <p role="status" className="m-0 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{ok}</p>}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>{pendente ? "Gerando…" : "Gerar IAEC-AD em PDF"}</button>
    </form>
  );
}
