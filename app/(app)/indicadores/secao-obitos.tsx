"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { definirDoObito } from "../../actions";
import type { Obito } from "@/lib/indicadores";
import type { Comum } from "@/lib/indicadores-pdf";
import { formatarData } from "@/lib/opcoes";
import { Aviso, Cabecalho, ColunaEmad, Moldura } from "./quadro";

type Resposta = "sim" | "nao" | "";
const paraResposta = (v: boolean | null): Resposta => (v === true ? "sim" : v === false ? "nao" : "");
const GRADE = "grid-cols-[5rem_minmax(0,1.3fr)_minmax(0,1fr)]";

export async function pdfObitos(obitos: Obito[]) {
  return (await import("@/lib/indicadores-pdf")).quadroObitos(obitos.map((o) => ({
    nome: o.nome, prontuario: o.prontuario, data: o.data ? formatarData(o.data) : "", doPrograma: o.doPrograma, justificativa: o.justificativa ?? "", numero: o.numero ?? "",
  })));
}

export function SecaoObitos({ obitos, semData, editar, comum }: { obitos: Obito[]; semData: Obito[]; editar: boolean; comum: Comum }) {
  const pendentes = obitos.filter((o) => o.doPrograma === null || (o.doPrograma === false && !o.justificativa) || (o.doPrograma === true && !o.numero)).length;
  return (
    <Moldura
      id="obitos" titulo="ÓBITOS"
      nota={<>Se caso a Declaração de óbito <strong>não</strong> tiver sido fornecida pelo Programa, <strong>justificar o motivo</strong>.</>}
      acoes={
        <>
          {pendentes > 0 && <span className="text-sm font-semibold text-danger-strong">{pendentes} sem a resposta da DO, o número da DO ou a justificativa.</span>}
        </>
      }
    >
      <Cabecalho cor="#aeaaaa" grade={GRADE} colunas={["EMAD", "Paciente", "DO fornecida pelo Programa (Sim ou Não)"]} />
      <div className="grid sm:grid-cols-[5rem_1fr]">
        <ColunaEmad cor="#d9e1f2" />
        {obitos.length === 0 ? (
          <p className="m-0 px-4 py-6 text-center text-sm text-muted">Nenhum óbito registrado em {comum.nomeMes.toLowerCase()}.</p>
        ) : (
          <ul className="m-0 grid list-none divide-y divide-border p-0">
            {obitos.map((o) => <LinhaObito key={o.id} o={o} editar={editar} />)}
          </ul>
        )}
      </div>
      {semData.length > 0 && (
        <div className="grid gap-1 border-t border-border bg-detail px-4 py-3 text-sm">
          <p className="m-0 font-semibold text-heading">
            {semData.length === 1 ? "1 óbito está sem data e não entra" : `${semData.length} óbitos estão sem data e não entram`} em nenhum mês. Informe a data no cadastro:
          </p>
          {semData.map((o) => (
            <p key={o.id} className="m-0">
              <Link href={`/pacientes/${o.id}/editar`} className="font-semibold text-accent underline">{o.nome}</Link>
              <span className="text-muted"> · pront. {o.prontuario}</span>
            </p>
          ))}
        </div>
      )}
    </Moldura>
  );
}

function LinhaObito({ o, editar }: { o: Obito; editar: boolean }) {
  const salvo = { do: paraResposta(o.doPrograma), justificativa: o.justificativa ?? "", numero: o.numero ?? "" };
  const [doProg, setDoProg] = useState<Resposta>(salvo.do);
  const [justificativa, setJustificativa] = useState(salvo.justificativa);
  const [numero, setNumero] = useState(salvo.numero);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const mudou = doProg !== salvo.do || (doProg === "nao" && justificativa.trim() !== salvo.justificativa) || (doProg === "sim" && numero.trim() !== salvo.numero);

  function salvar() {
    setAviso(null);
    iniciar(async () => {
      const r = await definirDoObito(o.id, doProg, justificativa, numero);
      setAviso(r.erro ? { ok: false, texto: r.erro } : { ok: true, texto: "Salvo." });
    });
  }

  const opcao = (v: Resposta, rotulo: string) => (
    <button
      type="button" role="radio" aria-checked={doProg === v} disabled={!editar} onClick={() => setDoProg(v)}
      className={`min-h-10 rounded-full border px-4 text-sm font-semibold disabled:cursor-default ${doProg === v ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted"}`}
    >
      {rotulo}
    </button>
  );

  return (
    <li className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] sm:items-start">
      <div className="min-w-0">
        <Link href={`/pacientes/${o.id}`} className="font-bold text-heading hover:underline">{o.nome}</Link>
        <p className="m-0 text-sm text-muted">
          {[o.data ? `Óbito em ${formatarData(o.data)}` : "", `Pront. ${o.prontuario}`, o.motivo].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="grid gap-2">
        <div role="radiogroup" aria-label="DO fornecida pelo Programa" className="flex flex-wrap gap-1.5">
          {opcao("sim", "Sim")}
          {opcao("nao", "Não")}
          {opcao("", "Não informado")}
        </div>
        {doProg === "sim" && (
          <input
            value={numero} onChange={(e) => setNumero(e.target.value)} readOnly={!editar} maxLength={30} inputMode="numeric"
            placeholder="Número da DO" aria-label="Número da DO" className="campo"
          />
        )}
        {doProg === "nao" && (
          <textarea
            value={justificativa} onChange={(e) => setJustificativa(e.target.value)} readOnly={!editar} rows={2} maxLength={500}
            placeholder="Justifique por que a DO não foi fornecida pelo Programa" aria-label="Justificativa" className="campo"
          />
        )}
        {editar && (mudou || aviso) && (
          <div className="flex items-center gap-3">
            {mudou && (
              <button type="button" onClick={salvar} disabled={pendente} className="btn-primario min-h-10 px-4 text-sm">
                {pendente ? "Salvando…" : "Salvar"}
              </button>
            )}
            <Aviso aviso={aviso} />
          </div>
        )}
      </div>
    </li>
  );
}
