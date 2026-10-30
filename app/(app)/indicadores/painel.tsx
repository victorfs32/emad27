"use client";

import Link from "next/link";
import type { Alta, BuscaAtiva, Obito, PacienteAd1, Reinternacao } from "@/lib/indicadores";
import type { Comum } from "@/lib/indicadores-pdf";
import { BotaoPdfTodos } from "./quadro";
import { SecaoAd1, pdfAd1 } from "./secao-ad1";
import { SecaoAltas, pdfAltas } from "./secao-altas";
import { SecaoBusca, pdfBusca } from "./secao-busca";
import { SecaoObitos, pdfObitos } from "./secao-obitos";
import { SecaoReinternacao, pdfReinternacao } from "./secao-reinternacao";

type Props = {
  comum: Comum; anterior: string; proximo: string; editar: boolean; faltaMigracao: boolean;
  dataPadrao: string; limite: { min: string; max: string };
  pacientes: { id: number; nome: string; prontuario: string }[];
  obitos: Obito[]; obitosSemData: Obito[]; ad1: PacienteAd1[]; reinternacoes: Reinternacao[]; buscaAtiva: BuscaAtiva[]; altas: Alta[];
};

const ATALHOS = [["obitos", "Óbitos"], ["ad1", "Acompanhamento AD1"], ["reinternacao", "Reinternação"], ["busca", "Busca ativa"], ["altas", "Altas"]];

export function PainelIndicadores(p: Props) {
  const editar = p.editar && !p.faltaMigracao;
  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <nav className="flex items-center gap-2" aria-label="Mês">
          <Link href={`/indicadores?mes=${p.anterior}`} className="btn-secundario min-h-11 px-4" aria-label="Mês anterior">‹</Link>
          <span className="min-w-44 text-center text-lg font-bold text-heading">{p.comum.nomeMes}</span>
          <Link href={`/indicadores?mes=${p.proximo}`} className="btn-secundario min-h-11 px-4" aria-label="Próximo mês">›</Link>
        </nav>
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Indicadores">
          {ATALHOS.map(([id, rotulo]) => (
            <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-muted hover:text-heading">
              {rotulo}
            </a>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <BotaoPdfTodos
            comum={p.comum}
            quadros={() => Promise.all([pdfObitos(p.obitos), pdfAd1(p.ad1), pdfReinternacao(p.reinternacoes), pdfBusca(p.buscaAtiva), pdfAltas(p.altas)])}
          />
          <span className="text-sm text-muted">Os 5 quadros numa folha só, com espaço para assinatura e carimbo à mão.</span>
        </div>
        {p.faltaMigracao && (
          <p role="alert" className="m-0 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">
            Falta rodar a migração v19 no Supabase: até lá os quadros mostram o que já existe no cadastro, mas não dá para registrar nem salvar respostas.
          </p>
        )}
      </div>

      <SecaoObitos obitos={p.obitos} semData={p.obitosSemData} editar={editar} comum={p.comum} />
      <SecaoAd1 lista={p.ad1} editar={editar} />
      <SecaoReinternacao lista={p.reinternacoes} pacientes={p.pacientes} editar={editar} comum={p.comum} dataPadrao={p.dataPadrao} limite={p.limite} />
      <SecaoBusca lista={p.buscaAtiva} editar={editar} dataPadrao={p.dataPadrao} limite={p.limite} />
      <SecaoAltas lista={p.altas} editar={editar} comum={p.comum} />
    </div>
  );
}
