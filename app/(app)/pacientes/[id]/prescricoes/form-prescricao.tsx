"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { salvarPrescricao } from "../../../../actions";
import { COLUNAS_APRAZAMENTO, MAX_ITENS_PRESCRICAO, itemVazio, type DadosFormPrescricao, type ItemPrescricao } from "@/lib/prescricao-tipos";

type Props = { pacienteId: number; id: number | null; inicial: DadosFormPrescricao };

/** Digitação da prescrição médica: itens (data + texto) e as 5 colunas de aprazamento. */
export function FormPrescricao({ pacienteId, id, inicial }: Props) {
  const [dados, setDados] = useState<DadosFormPrescricao>(inicial);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  const mudarItem = (n: number, parte: Partial<ItemPrescricao>) =>
    setDados((d) => ({ ...d, itens: d.itens.map((it, i) => (i === n ? { ...it, ...parte } : it)) }));
  const mudarCelula = (n: number, k: number, valor: string) =>
    setDados((d) => ({
      ...d,
      itens: d.itens.map((it, i) => (i === n ? { ...it, aprazamento: it.aprazamento.map((a, j) => (j === k ? valor : a)) } : it)),
    }));

  function adicionar(copiarDe?: number) {
    setDados((d) => {
      if (d.itens.length >= MAX_ITENS_PRESCRICAO) return d;
      const base = copiarDe === undefined ? itemVazio(d.data) : { ...d.itens[copiarDe], aprazamento: [...d.itens[copiarDe].aprazamento] };
      const itens = [...d.itens];
      itens.splice(copiarDe === undefined ? itens.length : copiarDe + 1, 0, base);
      return { ...d, itens };
    });
  }
  const remover = (n: number) => setDados((d) => ({ ...d, itens: d.itens.filter((_, i) => i !== n) }));

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    iniciar(async () => {
      try {
        const r = await salvarPrescricao(id, pacienteId, dados);
        if (r?.erro) setErro(r.erro);
      } catch (err) {
        // o redirecionamento após salvar chega aqui como exceção do Next; só mostramos outros erros
        if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
        console.error(err);
        setErro("Não foi possível salvar a prescrição. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={enviar} className="grid min-w-0 gap-5">
      <section className="cartao grid gap-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
          <div>
            <label htmlFor="pdata" className="rotulo">Data da prescrição</label>
            <input id="pdata" type="date" required value={dados.data} onChange={(e) => setDados({ ...dados, data: e.target.value })} className="campo" />
          </div>
        </div>
        <div>
          <p className="rotulo m-0">Datas do aprazamento (opcional)</p>
          <p className="mb-2 mt-0.5 text-xs text-muted">Aparecem no topo das 5 colunas do formulário. Deixe vazio para preencher à mão.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {dados.datas_aprazamento.map((v, k) => (
              <input
                key={k}
                type="date"
                aria-label={`Data da coluna ${k + 1} do aprazamento`}
                value={v}
                onChange={(e) => setDados({ ...dados, datas_aprazamento: dados.datas_aprazamento.map((x, j) => (j === k ? e.target.value : x)) })}
                className="campo"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="m-0 text-base font-bold text-heading">Itens da prescrição</h2>
        {dados.itens.map((it, n) => (
          <div key={n} className="cartao grid min-w-0 gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-heading">Item {n + 1}</strong>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => adicionar(n)} className="btn-secundario !min-h-9 !px-3 !text-xs">Duplicar</button>
                {dados.itens.length > 1 && (
                  <button type="button" onClick={() => remover(n)} className="btn-secundario !min-h-9 !px-3 !text-xs !text-danger-strong">Remover</button>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
              <div>
                <label htmlFor={`d${n}`} className="rotulo">Data</label>
                <input id={`d${n}`} type="date" value={it.data} onChange={(e) => mudarItem(n, { data: e.target.value })} className="campo" />
              </div>
              <div>
                <label htmlFor={`t${n}`} className="rotulo">Prescrição</label>
                <textarea
                  id={`t${n}`}
                  rows={3}
                  maxLength={2000}
                  value={it.texto}
                  onChange={(e) => mudarItem(n, { texto: e.target.value })}
                  placeholder="Ex.: Dipirona 500 mg, 1 comprimido VO de 6/6h se dor ou febre"
                  className="campo"
                />
              </div>
            </div>
            <div>
              <p className="rotulo m-0">Aprazamento (horários / visto)</p>
              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {Array.from({ length: COLUNAS_APRAZAMENTO }, (_, k) => (
                  <input
                    key={k}
                    value={it.aprazamento[k] ?? ""}
                    maxLength={60}
                    onChange={(e) => mudarCelula(n, k, e.target.value)}
                    aria-label={`Item ${n + 1}, coluna ${k + 1} do aprazamento`}
                    placeholder={dados.datas_aprazamento[k] ? dados.datas_aprazamento[k].split("-").reverse().slice(0, 2).join("/") : `Col. ${k + 1}`}
                    className="campo"
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => adicionar()} disabled={dados.itens.length >= MAX_ITENS_PRESCRICAO} className="btn-secundario w-full sm:w-auto sm:justify-self-start">
          + Adicionar item
        </button>
      </section>

      <section className="cartao">
        <label htmlFor="obs" className="rotulo">Observações (opcional)</label>
        <textarea id="obs" rows={3} maxLength={2000} value={dados.observacoes} onChange={(e) => setDados({ ...dados, observacoes: e.target.value })} className="campo" placeholder="Orientações gerais, cuidados, retorno…" />
      </section>

      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}

      <div className="flex flex-wrap gap-3">
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : id ? "Salvar alterações" : "Salvar prescrição"}</button>
        <Link href={`/pacientes/${pacienteId}?aba=prescricoes`} className="btn-secundario">Cancelar</Link>
      </div>
    </form>
  );
}
