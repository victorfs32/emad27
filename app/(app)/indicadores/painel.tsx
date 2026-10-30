"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { definirDoObito } from "../../actions";
import type { Obito } from "@/lib/pacientes";
import { formatarData } from "@/lib/opcoes";
import { IconeBaixar } from "../icones";

type Props = {
  mes: string; nomeMes: string; anterior: string; proximo: string; hoje: string;
  editar: boolean; carimbo: string[]; obitos: Obito[]; semData: Obito[]; faltaMigracao: boolean;
};

type Resposta = "sim" | "nao" | "";
const paraResposta = (v: boolean | null): Resposta => (v === true ? "sim" : v === false ? "nao" : "");

export function PainelIndicadores({ mes, nomeMes, anterior, proximo, hoje, editar, carimbo, obitos, semData, faltaMigracao }: Props) {
  // Respostas exibidas (já salvas ou acabadas de salvar), usadas também no PDF.
  const [respostas, setRespostas] = useState<Record<number, { do: Resposta; justificativa: string }>>(() =>
    Object.fromEntries(obitos.map((o) => [o.id, { do: paraResposta(o.doPrograma), justificativa: o.justificativa ?? "" }])),
  );
  const [gerando, setGerando] = useState(false);
  const [erroPdf, setErroPdf] = useState("");

  const pendentes = obitos.filter((o) => {
    const r = respostas[o.id];
    return !r || r.do === "" || (r.do === "nao" && !r.justificativa.trim());
  }).length;

  async function baixarPdf() {
    setErroPdf("");
    setGerando(true);
    try {
      const { gerarIndicadoresPdf } = await import("@/lib/indicadores-pdf");
      await gerarIndicadoresPdf({
        emad: "27", mes, nomeMes, hoje, carimbo,
        obitos: obitos.map((o) => {
          const r = respostas[o.id] ?? { do: "", justificativa: "" };
          return {
            nome: o.nome, prontuario: o.prontuario, data: o.data ? formatarData(o.data) : "",
            doPrograma: r.do === "sim" ? true : r.do === "nao" ? false : null, justificativa: r.justificativa,
          };
        }),
      });
    } catch (e) {
      console.error(e);
      setErroPdf("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="grid gap-6">
      <nav className="flex items-center gap-2" aria-label="Mês">
        <Link href={`/indicadores?mes=${anterior}`} className="btn-secundario min-h-11 px-4" aria-label="Mês anterior">‹</Link>
        <span className="min-w-44 text-center text-lg font-bold text-heading">{nomeMes}</span>
        <Link href={`/indicadores?mes=${proximo}`} className="btn-secundario min-h-11 px-4" aria-label="Próximo mês">›</Link>
      </nav>

      {faltaMigracao && (
        <p role="alert" className="m-0 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">
          Falta rodar a migração v19 no Supabase para guardar a resposta sobre a declaração de óbito.
        </p>
      )}

      <section className="overflow-hidden rounded-[22px] border border-border bg-surface shadow-card">
        <h2 className="m-0 bg-[#ffc000] px-4 py-2.5 text-center text-lg font-extrabold tracking-wide text-[#1a1a1a]">ÓBITOS</h2>
        <div className="hidden grid-cols-[5rem_minmax(0,1.3fr)_minmax(0,1fr)] bg-[#aeaaaa] text-sm font-bold text-[#1a1a1a] sm:grid">
          <span className="px-3 py-2 text-center">EMAD</span>
          <span className="px-3 py-2">Paciente</span>
          <span className="px-3 py-2">DO fornecida pelo Programa (Sim ou Não)</span>
        </div>
        {obitos.length === 0 ? (
          <div className="grid sm:grid-cols-[5rem_1fr]">
            <span className="hidden items-center justify-center bg-[#d9e1f2] text-lg font-extrabold text-[#1a1a1a] sm:flex">27</span>
            <p className="m-0 px-4 py-6 text-center text-sm text-muted">Nenhum óbito registrado em {nomeMes.toLowerCase()}.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-[5rem_1fr]">
            <span className="hidden items-center justify-center bg-[#d9e1f2] text-lg font-extrabold text-[#1a1a1a] sm:flex">27</span>
            <ul className="m-0 grid list-none divide-y divide-border p-0">
              {obitos.map((o) => (
                <LinhaObito
                  key={o.id} o={o} editar={editar && !faltaMigracao} resposta={respostas[o.id]}
                  salva={(r) => setRespostas((atual) => ({ ...atual, [o.id]: r }))}
                />
              ))}
            </ul>
          </div>
        )}
        <p className="m-0 bg-[#ffff00] px-4 py-2 text-center text-sm text-[#1a1a1a]">
          Se caso a Declaração de óbito <strong>não</strong> tiver sido fornecida pelo Programa, <strong>justificar o motivo</strong>.
        </p>
      </section>

      {semData.length > 0 && (
        <div className="cartao grid gap-2">
          <p className="m-0 text-sm font-semibold text-heading">
            {semData.length === 1 ? "1 óbito está sem data e não entra" : `${semData.length} óbitos estão sem data e não entram`} em nenhum mês. Informe a data no cadastro:
          </p>
          <ul className="m-0 grid list-none gap-1 p-0 text-sm">
            {semData.map((o) => (
              <li key={o.id}>
                <Link href={`/pacientes/${o.id}/editar`} className="font-semibold text-accent underline">{o.nome}</Link>
                <span className="text-muted"> · pront. {o.prontuario}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={baixarPdf} disabled={gerando} className="btn-primario">
          <IconeBaixar /> {gerando ? "Gerando PDF…" : "Baixar indicadores em PDF"}
        </button>
        {pendentes > 0 && (
          <span className="text-sm font-semibold text-danger-strong">
            {pendentes === 1 ? "1 óbito ainda sem" : `${pendentes} óbitos ainda sem`} a resposta da DO ou a justificativa.
          </span>
        )}
      </div>
      {erroPdf && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erroPdf}</p>}
    </div>
  );
}

function LinhaObito({ o, editar, resposta, salva }: {
  o: Obito; editar: boolean; resposta?: { do: Resposta; justificativa: string };
  salva: (r: { do: Resposta; justificativa: string }) => void;
}) {
  const [doProg, setDoProg] = useState<Resposta>(resposta?.do ?? "");
  const [justificativa, setJustificativa] = useState(resposta?.justificativa ?? "");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const mudou = doProg !== (resposta?.do ?? "") || (doProg === "nao" && justificativa !== (resposta?.justificativa ?? ""));

  function salvar() {
    setAviso(null);
    iniciar(async () => {
      const r = await definirDoObito(o.id, doProg, justificativa);
      if (r.erro) {
        setAviso({ ok: false, texto: r.erro });
        return;
      }
      salva({ do: doProg, justificativa: doProg === "nao" ? justificativa.trim() : "" });
      setAviso({ ok: true, texto: "Salvo." });
    });
  }

  const opcao = (v: Resposta, rotulo: string) => (
    <button
      type="button" role="radio" aria-checked={doProg === v} disabled={!editar} onClick={() => setDoProg(v)}
      className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${doProg === v ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted"} disabled:cursor-default`}
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
            {aviso && <span className={`text-sm font-semibold ${aviso.ok ? "text-success-strong" : "text-danger-strong"}`}>{aviso.texto}</span>}
          </div>
        )}
      </div>
    </li>
  );
}
