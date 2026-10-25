"use client";

import { useState, useTransition } from "react";
import { dadosCadastroDocumento } from "../../actions";
import { EXAMES_COLUNAS, MAX_OUTROS } from "@/lib/exames-pdf";

type Props = { pacientes: { id: number; nome: string; prontuario: string }[]; hoje: string; carimbo?: string[] };

/** Solicitação de exames: o cadastro entra sozinho; o médico marca os exames (e escreve outros, se precisar). */
export function FormExames({ pacientes, hoje, carimbo }: Props) {
  const [paciente, setPaciente] = useState("");
  const [marcados, setMarcados] = useState<string[]>([]);
  const [outros, setOutros] = useState("");
  const [coleta, setColeta] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [pendente, iniciar] = useTransition();

  const alternar = (e: string) => setMarcados((x) => (x.includes(e) ? x.filter((y) => y !== e) : [...x, e]));
  const linhasOutros = outros.split("\n").map((l) => l.trim()).filter(Boolean);

  function gerar(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    setOk("");
    if (marcados.length === 0 && linhasOutros.length === 0) {
      setErro("Marque ao menos um exame.");
      return;
    }
    if (linhasOutros.length > MAX_OUTROS) {
      setErro(`Cabem até ${MAX_OUTROS} exames em “Outros”.`);
      return;
    }
    iniciar(async () => {
      try {
        const r = await dadosCadastroDocumento("exames", Number(paciente));
        if (r.erro || !r.dados) {
          setErro(r.erro ?? "Não foi possível gerar o documento.");
          return;
        }
        const { gerarExamesPdf } = await import("@/lib/exames-pdf");
        await gerarExamesPdf({
          nome: r.dados.nome, nascimento: r.dados.nascimento, cns: r.dados.cns, mae: r.dados.mae, endereco: r.dados.endereco,
          marcados, outros: linhasOutros, dataColeta: coleta, hoje, carimbo,
        });
        setOk(`Solicitação de ${r.dados.nome} gerada.`);
      } catch (err) {
        console.error(err);
        setErro("Não foi possível gerar o PDF. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={gerar} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_minmax(0,12rem)]">
        <div>
          <label htmlFor="ex-paciente" className="rotulo">Paciente <span className="text-danger">*</span></label>
          <select id="ex-paciente" value={paciente} onChange={(e) => setPaciente(e.target.value)} required className="campo">
            <option value="">Escolha o paciente…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ex-coleta" className="rotulo">Data da coleta (opcional)</label>
          <input id="ex-coleta" type="date" value={coleta} onChange={(e) => setColeta(e.target.value)} className="campo" />
        </div>
      </div>

      <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
        <legend className="rotulo p-0">Exames ({marcados.length} marcado{marcados.length === 1 ? "" : "s"})</legend>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMES_COLUNAS.flat().map((e) => (
            <label key={e} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${marcados.includes(e) ? "border-accent bg-accent-soft font-semibold text-heading" : "border-border bg-surface text-muted"}`}>
              <input type="checkbox" checked={marcados.includes(e)} onChange={() => alternar(e)} className="h-4 w-4 accent-[var(--color-accent)]" />
              {e}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="ex-outros" className="rotulo">Outros exames (um por linha, até {MAX_OUTROS})</label>
        <textarea id="ex-outros" rows={3} value={outros} onChange={(e) => setOutros(e.target.value)} placeholder="Ex.: Raio-X de tórax" className="campo" />
      </div>

      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {ok && <p role="status" className="m-0 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{ok}</p>}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>{pendente ? "Gerando…" : "Gerar solicitação em PDF"}</button>
    </form>
  );
}
