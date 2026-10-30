"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { removerReinternacao, salvarReinternacao } from "../../actions";
import type { Reinternacao } from "@/lib/indicadores";
import type { Comum } from "@/lib/indicadores-pdf";
import { DIAS_REINTERNACAO } from "@/lib/indicadores-opcoes";
import { formatarData } from "@/lib/opcoes";
import { Aviso, BotaoPdf, Cabecalho, ColunaEmad, Moldura } from "./quadro";

const GRADE = "grid-cols-[5rem_minmax(0,1.2fr)_7rem_7rem_minmax(0,1fr)_3rem]";

type Props = {
  lista: Reinternacao[]; pacientes: { id: number; nome: string; prontuario: string }[];
  editar: boolean; comum: Comum; dataPadrao: string; limite: { min: string; max: string };
};

export async function pdfReinternacao(lista: Reinternacao[]) {
  const contam = lista.filter((r) => r.conta);
  return (await import("@/lib/indicadores-pdf")).quadroReinternacao(
    contam.map((r) => ({
      nome: r.nome, prontuario: r.prontuario, admissao: r.admissao ? formatarData(r.admissao) : "", data: formatarData(r.data), motivo: r.motivo ?? "",
    })),
    lista.length - contam.length,
  );
}

export function SecaoReinternacao({ lista, pacientes, editar, comum, dataPadrao, limite }: Props) {
  return (
    <Moldura
      id="reinternacao" titulo={`REINTERNAÇÃO (ATÉ ${DIAS_REINTERNACAO} DIAS APÓS ADMISSÃO HOSPITALAR)`}
      nota={`Contar como Reinternação os pacientes que voltaram para o hospital até ${DIAS_REINTERNACAO} dias após Desospitalização.`}
      acoes={
        <BotaoPdf
          comum={comum} rotulo="Baixar PDF de reinternação"
          quadro={() => pdfReinternacao(lista)}
        />
      }
    >
      {editar && <FormReinternacao pacientes={pacientes} dataPadrao={dataPadrao} limite={limite} />}
      <Cabecalho cor="#f4b183" grade={GRADE} colunas={["EMAD", "Paciente", "Data de Admissão", "Data de Reinternação", "Motivo da Reinternação", ""]} />
      <div className="grid sm:grid-cols-[5rem_1fr]">
        <ColunaEmad cor="#fff2cc" />
        {lista.length === 0 ? (
          <p className="m-0 px-4 py-6 text-center text-sm text-muted">Nenhuma reinternação registrada em {comum.nomeMes.toLowerCase()}.</p>
        ) : (
          <ul className="m-0 grid list-none divide-y divide-border p-0">
            {lista.map((r) => <LinhaReinternacao key={r.id} r={r} editar={editar} />)}
          </ul>
        )}
      </div>
    </Moldura>
  );
}

function FormReinternacao({ pacientes, dataPadrao, limite }: { pacientes: Props["pacientes"]; dataPadrao: string; limite: Props["limite"] }) {
  const [paciente, setPaciente] = useState("");
  const [data, setData] = useState(dataPadrao);
  const [motivo, setMotivo] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    iniciar(async () => {
      const r = await salvarReinternacao(Number(paciente), data, motivo);
      if (r.erro) setAviso({ ok: false, texto: r.erro });
      else {
        setAviso({ ok: true, texto: "Reinternação registrada." });
        setPaciente("");
        setMotivo("");
      }
    });
  }

  return (
    <form onSubmit={salvar} className="grid gap-3 border-b border-border bg-detail p-4 sm:grid-cols-[minmax(0,1.3fr)_10rem_minmax(0,1fr)_auto] sm:items-end">
      <div>
        <label htmlFor="re-pac" className="rotulo">Paciente</label>
        <select id="re-pac" value={paciente} onChange={(e) => setPaciente(e.target.value)} required className="campo">
          <option value="">Escolha o paciente…</option>
          {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="re-data" className="rotulo">Data da reinternação</label>
        <input id="re-data" type="date" value={data} min={limite.min} max={limite.max} onChange={(e) => setData(e.target.value)} required className="campo" />
      </div>
      <div>
        <label htmlFor="re-mot" className="rotulo">Motivo</label>
        <input id="re-mot" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} placeholder="Ex.: pneumonia" className="campo" />
      </div>
      <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Registrar"}</button>
      {aviso && <div className="sm:col-span-4"><Aviso aviso={aviso} /></div>}
    </form>
  );
}

function LinhaReinternacao({ r, editar }: { r: Reinternacao; editar: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  function remover() {
    if (!window.confirm(`Remover a reinternação de ${r.nome} em ${formatarData(r.data)}?`)) return;
    setErro("");
    iniciar(async () => {
      const res = await removerReinternacao(r.id);
      if (res.erro) setErro(res.erro);
    });
  }
  return (
    <li className={`grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1.2fr)_7rem_7rem_minmax(0,1fr)_3rem] sm:items-center sm:gap-0 ${pendente ? "opacity-60" : ""}`}>
      <div className="min-w-0 sm:pr-3">
        <Link href={`/pacientes/${r.pacienteId}`} className="font-bold text-heading hover:underline">{r.nome}</Link>
        <p className="m-0 text-sm text-muted">Pront. {r.prontuario}</p>
        <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${r.conta ? "bg-danger-soft text-danger-strong" : "bg-detail text-muted"}`}>
          {r.dias === null ? "Sem data de admissão" : r.conta ? `Conta no indicador (${r.dias} dias)` : `Não conta: ${r.dias} dias após a admissão`}
        </span>
      </div>
      <span className="text-sm"><span className="text-muted sm:hidden">Admissão: </span>{r.admissao ? formatarData(r.admissao) : "—"}</span>
      <span className="text-sm"><span className="text-muted sm:hidden">Reinternação: </span>{formatarData(r.data)}</span>
      <span className="text-sm text-heading">{r.motivo ?? "—"}</span>
      {editar && (
        <button type="button" onClick={remover} disabled={pendente} className="justify-self-start text-sm font-semibold text-muted underline sm:justify-self-center">
          Remover
        </button>
      )}
      {erro && <span className="text-sm font-semibold text-danger-strong">{erro}</span>}
    </li>
  );
}
