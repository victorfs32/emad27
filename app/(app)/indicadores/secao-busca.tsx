"use client";

import { useState, useTransition } from "react";
import { removerBuscaAtiva, salvarBuscaAtiva } from "../../actions";
import type { BuscaAtiva } from "@/lib/indicadores";
import type { Comum } from "@/lib/indicadores-pdf";
import { formatarData } from "@/lib/opcoes";
import { Aviso, BotaoPdf, Cabecalho, ColunaEmad, Moldura } from "./quadro";

const GRADE = "grid-cols-[5rem_minmax(0,1fr)_12rem_6rem]";

type Props = { lista: BuscaAtiva[]; editar: boolean; comum: Comum; dataPadrao: string; limite: { min: string; max: string } };

export async function pdfBusca(lista: BuscaAtiva[]) {
  return (await import("@/lib/indicadores-pdf")).quadroBuscaAtiva(lista.map((b) => ({ paciente: b.paciente, situacao: b.situacao })));
}

export function SecaoBusca({ lista, editar, comum, dataPadrao, limite }: Props) {
  return (
    <Moldura
      id="busca" titulo="BUSCA ATIVA"
      nota={<>Caso não tenha ocorrido Busca Ativa durante o mês, sinalizar como: <strong>NÃO HOUVE BUSCA ATIVA</strong></>}
      acoes={
        <BotaoPdf
          comum={comum} rotulo="Baixar PDF de busca ativa"
          quadro={() => pdfBusca(lista)}
        />
      }
    >
      {editar && <FormBusca dataPadrao={dataPadrao} limite={limite} />}
      <Cabecalho cor="#a6a6a6" grade={GRADE} colunas={["EMAD", "Paciente", "Situação", ""]} />
      <div className="grid sm:grid-cols-[5rem_1fr]">
        <ColunaEmad cor="#bfbfbf" />
        {lista.length === 0 ? (
          <p className="m-0 px-4 py-6 text-center text-sm font-bold text-heading">NÃO HOUVE BUSCA ATIVA</p>
        ) : (
          <ul className="m-0 grid list-none divide-y divide-border p-0">
            {lista.map((b) => <LinhaBusca key={b.id} b={b} editar={editar} />)}
          </ul>
        )}
      </div>
    </Moldura>
  );
}

function FormBusca({ dataPadrao, limite }: { dataPadrao: string; limite: Props["limite"] }) {
  const [nome, setNome] = useState("");
  const [data, setData] = useState(dataPadrao);
  const [situacao, setSituacao] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    iniciar(async () => {
      const r = await salvarBuscaAtiva(data, nome, situacao);
      if (r.erro) setAviso({ ok: false, texto: r.erro });
      else {
        setAviso({ ok: true, texto: "Busca ativa registrada." });
        setNome("");
        setSituacao("");
      }
    });
  }

  const opcao = (v: string, rotulo: string) => (
    <button
      type="button" role="radio" aria-checked={situacao === v} onClick={() => setSituacao(v)}
      className={`min-h-12 flex-1 rounded-2xl border px-3 text-sm font-semibold ${situacao === v ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted"}`}
    >
      {rotulo}
    </button>
  );

  return (
    <form onSubmit={salvar} className="grid gap-3 border-b border-border bg-detail p-4 sm:grid-cols-[minmax(0,1.3fr)_10rem_minmax(0,1fr)_auto] sm:items-end">
      <div>
        <label htmlFor="ba-nome" className="rotulo">Paciente avaliado</label>
        <input id="ba-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} required placeholder="Nome completo" className="campo" />
      </div>
      <div>
        <label htmlFor="ba-data" className="rotulo">Data</label>
        <input id="ba-data" type="date" value={data} min={limite.min} max={limite.max} onChange={(e) => setData(e.target.value)} required className="campo" />
      </div>
      <div>
        <span className="rotulo">Situação</span>
        <div role="radiogroup" aria-label="Situação" className="flex gap-2">
          {opcao("elegivel", "Elegível")}
          {opcao("inelegivel", "Inelegível")}
        </div>
      </div>
      <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Registrar"}</button>
      {aviso && <div className="sm:col-span-4"><Aviso aviso={aviso} /></div>}
    </form>
  );
}

function LinhaBusca({ b, editar }: { b: BuscaAtiva; editar: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  function remover() {
    if (!window.confirm(`Remover a busca ativa de ${b.paciente}?`)) return;
    setErro("");
    iniciar(async () => {
      const r = await removerBuscaAtiva(b.id);
      if (r.erro) setErro(r.erro);
    });
  }
  return (
    <li className={`grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_12rem_6rem] sm:items-center ${pendente ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <p className="m-0 font-bold text-heading">{b.paciente}</p>
        <p className="m-0 text-sm text-muted">{formatarData(b.data)} · registrado por {b.autor}</p>
      </div>
      <span className={`justify-self-start rounded-full px-3 py-1 text-xs font-bold sm:justify-self-center ${b.situacao === "elegivel" ? "bg-success-soft text-success-strong" : "bg-detail text-heading"}`}>
        {b.situacao === "elegivel" ? "ELEGÍVEL" : "INELEGÍVEL"}
      </span>
      {editar && (
        <button type="button" onClick={remover} disabled={pendente} className="justify-self-start text-sm font-semibold text-muted underline sm:justify-self-center">
          Remover
        </button>
      )}
      {erro && <span className="text-sm font-semibold text-danger-strong">{erro}</span>}
    </li>
  );
}
