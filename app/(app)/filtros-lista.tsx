import { DIURESE, FISIO, MODALIDADES, SITUACOES, SITUACOES_ARQUIVADAS, SITUACOES_PRINCIPAIS, VIAS_DIETA } from "@/lib/opcoes";
import type { Filtros, Uaps } from "@/lib/pacientes";
import { IconeBusca, IconeFiltro } from "./icones";

type Props = { f: Filtros; uapss: Uaps[]; bairros: string[] };

const TRI = [["", "Todos"], ["sim", "Sim"], ["nao", "Não"], ["ni", "Não informado"]];

function Seletor({
  nome, rotulo, valor, children,
}: { nome: string; rotulo: string; valor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`f-${nome}`} className="rotulo">{rotulo}</label>
      <select id={`f-${nome}`} name={nome} defaultValue={valor} className="campo">{children}</select>
    </div>
  );
}

/** Busca rápida + filtros combinados. Formulário GET simples (funciona sem JavaScript). */
export function FiltrosLista({ f, uapss, bairros }: Props) {
  const grupoSit = f.grupo === "arquivados" ? SITUACOES_ARQUIVADAS : SITUACOES_PRINCIPAIS;
  const avancados = [f.uaps, f.bairro, f.modalidade, f.de, f.ate, f.fisio, f.dieta, f.diurese, f.tqt, f.lpp, f.o2].filter(Boolean).length;

  return (
    <form role="search" className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3.5 focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(29,111,87,0.2)]">
          <IconeBusca className="h-[18px] w-[18px] text-muted" />
          <input
            name="q"
            defaultValue={f.q}
            placeholder="Buscar nome, prontuário, CPF ou CNS…"
            aria-label="Busca rápida"
            className="h-12 w-full bg-transparent text-[15px] text-heading outline-none placeholder:text-muted/70"
          />
        </label>
        <select name="situacao" defaultValue={f.situacao} aria-label="Situação" className="campo sm:w-auto">
          <option value="">Todas as situações</option>
          {SITUACOES.filter((s) => (grupoSit as readonly string[]).includes(s.valor)).map((s) => (
            <option key={s.valor} value={s.valor}>{s.rotulo}</option>
          ))}
        </select>
        <button className="btn-primario">Buscar</button>
      </div>

      <details className="rounded-2xl border border-border bg-surface" open={avancados > 0}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-heading">
          <IconeFiltro className="h-4 w-4 text-muted" /> Filtros combinados
          {avancados > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">{avancados}</span>}
        </summary>
        <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Seletor nome="uaps" rotulo="UAPS" valor={f.uaps}>
            <option value="">Todas</option>
            {uapss.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Seletor>
          <Seletor nome="bairro" rotulo="Bairro" valor={f.bairro}>
            <option value="">Todos</option>
            {bairros.map((b) => <option key={b}>{b}</option>)}
          </Seletor>
          <Seletor nome="modalidade" rotulo="Modalidade" valor={f.modalidade}>
            <option value="">Todas</option>
            {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
          </Seletor>
          <div>
            <label htmlFor="f-de" className="rotulo">Admissão a partir de</label>
            <input id="f-de" type="date" name="de" defaultValue={f.de} className="campo" />
          </div>
          <div>
            <label htmlFor="f-ate" className="rotulo">Admissão até</label>
            <input id="f-ate" type="date" name="ate" defaultValue={f.ate} className="campo" />
          </div>
          <Seletor nome="fisio" rotulo="Fisioterapia" valor={f.fisio}>
            <option value="">Todas</option>
            {FISIO.map((x) => <option key={x.valor} value={x.valor}>{x.rotulo}</option>)}
          </Seletor>
          <Seletor nome="dieta" rotulo="Via de alimentação" valor={f.dieta}>
            <option value="">Todas</option>
            {VIAS_DIETA.map((x) => <option key={x.valor} value={x.valor}>{x.rotulo}</option>)}
          </Seletor>
          <Seletor nome="diurese" rotulo="Diurese" valor={f.diurese}>
            <option value="">Todas</option>
            {DIURESE.map((x) => <option key={x.valor} value={x.valor}>{x.rotulo}</option>)}
          </Seletor>
          <Seletor nome="tqt" rotulo="Traqueostomia (TQT)" valor={f.tqt}>
            {TRI.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Seletor>
          <Seletor nome="lpp" rotulo="Lesão por pressão (LPP)" valor={f.lpp}>
            {TRI.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Seletor>
          <Seletor nome="o2" rotulo="Oxigênio (O₂)" valor={f.o2}>
            {TRI.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </Seletor>
          <div className="flex items-end">
            <a href="?" className="btn-secundario !min-h-12 w-full">Limpar filtros</a>
          </div>
        </div>
      </details>
    </form>
  );
}
