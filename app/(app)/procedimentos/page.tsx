import Link from "next/link";
import { connection } from "next/server";
import { exigirUsuario } from "@/lib/auth";
import { listarPacientesBasico, listarProcedimentos, type Procedimento } from "@/lib/pacientes";
import { PROCEDIMENTOS, ROTULO_PROCEDIMENTO, deslocarMes, formatarData, hojeISO, mesValido, nomeDoMes } from "@/lib/opcoes";
import { excluirProcedimento } from "../../actions";
import { BotaoConfirmar } from "../botao-confirmar";
import { IconeMais, IconeProcedimento } from "../icones";
import { FormProcedimento } from "./form-procedimento";

type Linha = { id: number; nome: string; prontuario: string; uaps: string; contagem: Record<string, number>; total: number };

function Remover({ p }: { p: Procedimento }) {
  return (
    <BotaoConfirmar
      acao={excluirProcedimento.bind(null, p.id)}
      mensagem={`Remover ${p.tipo} de ${p.pacientes.nome} (${formatarData(p.data)})? Use só para corrigir um lançamento por engano. A remoção fica no histórico.`}
    >
      Remover
    </BotaoConfirmar>
  );
}

export default async function Procedimentos({ searchParams }: PageProps<"/procedimentos">) {
  await connection();
  const sp = await searchParams;
  const hoje = hojeISO();
  const mes = mesValido(sp.mes) ? (sp.mes as string) : hoje.slice(0, 7);
  const so = sp.com === "1";

  const usuario = await exigirUsuario();
  const editar = usuario.perms.editar;
  const [lancamentos, pacientes] = await Promise.all([listarProcedimentos({ mes }), listarPacientesBasico()]);

  // Uma linha por paciente (todos os ativos + quem teve procedimento no mês), como na planilha.
  const mapa = new Map<number, Linha>();
  const nova = (id: number, nome: string, prontuario: string, uaps: string | null): Linha => ({
    id, nome, prontuario, uaps: uaps ?? "UAPS não informada", contagem: {}, total: 0,
  });
  for (const p of pacientes) mapa.set(p.id, nova(p.id, p.nome, p.prontuario, p.uaps));
  for (const l of lancamentos) {
    const linha = mapa.get(l.paciente_id) ?? nova(l.paciente_id, l.pacientes.nome, l.pacientes.prontuario, l.pacientes.uaps?.nome ?? null);
    mapa.set(l.paciente_id, linha);
    linha.contagem[l.tipo] = (linha.contagem[l.tipo] ?? 0) + 1;
    linha.total++;
  }
  const linhas = [...mapa.values()]
    .filter((l) => !so || l.total > 0)
    .sort((a, b) => a.uaps.localeCompare(b.uaps, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"));
  const grupos = new Map<string, Linha[]>();
  for (const l of linhas) grupos.set(l.uaps, [...(grupos.get(l.uaps) ?? []), l]);

  const totais = Object.fromEntries(PROCEDIMENTOS.map((p) => [p, lancamentos.filter((l) => l.tipo === p).length]));

  const url = (extra: Record<string, string>) => {
    const q = new URLSearchParams();
    const base: Record<string, string> = { mes, com: so ? "1" : "", ...extra };
    for (const [k, v] of Object.entries(base)) if (v) q.set(k, v);
    return `/procedimentos?${q}`;
  };
  const eMesAtual = mes === hoje.slice(0, 7);
  const rotulo = (p: string) => ROTULO_PROCEDIMENTO[p] ?? p;
  const celula = (n: number) =>
    n > 0 ? "bg-[#d9f2e2] font-bold text-success-strong" : "text-muted/50";

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">EMAD 27 · Procedimentos</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">{nomeDoMes(mes)}<span className="text-accent">.</span></h1>
        <p className="m-0 mt-1 text-sm text-muted">Quantos procedimentos cada paciente recebeu no mês, por tipo. Escolha o paciente e registre.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={url({ mes: deslocarMes(mes, -1) })} className="btn-secundario !min-h-11 !px-4" aria-label="Mês anterior">←</Link>
        <strong className="min-w-44 text-center text-lg text-heading">{nomeDoMes(mes)}</strong>
        <Link href={url({ mes: deslocarMes(mes, 1) })} className="btn-secundario !min-h-11 !px-4" aria-label="Próximo mês">→</Link>
        {!eMesAtual && <Link href={url({ mes: hoje.slice(0, 7) })} className="text-sm font-semibold text-accent hover:underline">Mês atual</Link>}
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8" aria-label="Totais do mês">
        {PROCEDIMENTOS.map((p) => (
          <div key={p} className="rounded-[22px] border border-border bg-surface p-4 text-center shadow-card">
            <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.06em] text-accent">{p}</p>
            <p className="mb-0 mt-2 text-[30px] font-extrabold leading-none tracking-[-0.03em] text-heading">{totais[p]}</p>
          </div>
        ))}
        <div className="col-span-2 rounded-[22px] border border-warning/30 bg-[#fff7cc] p-4 text-center shadow-card sm:col-span-4 lg:col-span-1">
          <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#6b5b00]">Total do mês</p>
          <p className="mb-0 mt-2 text-[30px] font-extrabold leading-none tracking-[-0.03em] text-heading">{lancamentos.length}</p>
        </div>
      </section>

      {editar && (
        <details className="cartao" open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-base font-bold text-heading">
            <IconeMais className="h-5 w-5 text-accent" /> Registrar procedimento
          </summary>
          <div className="mt-4"><FormProcedimento pacientes={pacientes} hoje={hoje} /></div>
        </details>
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-base font-bold text-heading">Por paciente</h2>
        <Link href={url({ com: so ? "" : "1" })} className={`rounded-full border px-4 py-2 text-sm font-semibold ${so ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:text-heading"}`}>
          Só com procedimentos
        </Link>
      </div>

      {linhas.length === 0 ? (
        <div className="rounded-[22px] border border-border bg-surface px-5 py-12 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><IconeProcedimento className="h-7 w-7" /></span>
          <p className="mb-0 mt-3 font-bold text-heading">Nenhum procedimento em {nomeDoMes(mes).toLowerCase()}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[22px] border border-border bg-surface shadow-card">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#0d5c63] text-[11.5px] font-bold uppercase tracking-[0.06em] text-white">
                <th className="sticky left-0 z-10 bg-[#0d5c63] px-4 py-3">Paciente</th>
                <th className="px-3 py-3 text-center">Total</th>
                {PROCEDIMENTOS.map((p) => <th key={p} className="px-3 py-3 text-center">{rotulo(p)}</th>)}
              </tr>
            </thead>
            {[...grupos].map(([uaps, itens]) => (
              <tbody key={uaps}>
                <tr><th colSpan={2 + PROCEDIMENTOS.length} className="bg-accent-soft px-4 py-2 text-left text-xs font-bold uppercase tracking-[0.08em] text-accent">{uaps}</th></tr>
                {itens.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 font-semibold">
                      <Link href={`/pacientes/${l.id}?aba=procedimentos`} className="text-heading hover:text-accent">{l.nome}</Link>
                    </td>
                    <td className="px-3 py-2.5 text-center font-extrabold text-heading">{l.total}</td>
                    {PROCEDIMENTOS.map((p) => (
                      <td key={p} className={`px-3 py-2.5 text-center tabular-nums ${celula(l.contagem[p] ?? 0)}`}>{l.contagem[p] || ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      <details className="cartao">
        <summary className="cursor-pointer list-none text-base font-bold text-heading">
          Lançamentos de {nomeDoMes(mes).toLowerCase()} <span className="font-normal text-muted">({lancamentos.length}) — datas, observações e correções</span>
        </summary>
        {lancamentos.length === 0 ? (
          <p className="mb-0 mt-3 text-sm text-muted">Nenhum lançamento no mês.</p>
        ) : (
          <ul className="m-0 mt-4 grid list-none gap-2 p-0">
            {lancamentos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-detail px-4 py-3 text-sm">
                <span className="tabular-nums text-muted">{formatarData(p.data)}</span>
                <Link href={`/pacientes/${p.paciente_id}?aba=procedimentos`} className="font-semibold text-heading hover:text-accent">{p.pacientes.nome}</Link>
                <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">{rotulo(p.tipo)}</span>
                {p.obs && <span className="text-muted">{p.obs}</span>}
                <span className="ml-auto text-xs text-muted">{p.autor}</span>
                {editar && <Remover p={p} />}
              </li>
            ))}
          </ul>
        )}
      </details>
      <p className="m-0 text-xs text-muted">A troca de GTT, SNG ou SVD registrada em Dispositivos (“Trocou”) entra aqui automaticamente.</p>
    </div>
  );
}
