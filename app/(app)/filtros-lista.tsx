import { MODALIDADES, STATUS } from "@/lib/opcoes";
import type { Grupo } from "@/lib/pacientes";
import { IconeBusca, IconeFiltro } from "./icones";

type Props = { busca: string; status: string; modalidade: string; lpp: boolean; grupo: Grupo };

/** Busca + situação + filtros avançados. Formulário GET simples (sem JavaScript no cliente). */
export function FiltrosLista({ busca, status, modalidade, lpp, grupo }: Props) {
  const opcoes = STATUS.filter((s) =>
    grupo === "arquivados" ? s.valor === "alta" || s.valor === "obito" : s.valor !== "alta" && s.valor !== "obito",
  );
  const filtrosAtivos = (modalidade ? 1 : 0) + (lpp ? 1 : 0);

  return (
    <form role="search" className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3.5 focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(29,111,87,0.2)]">
          <IconeBusca className="h-[18px] w-[18px] text-muted" />
          <input
            name="q"
            defaultValue={busca}
            placeholder="Buscar nome, CPF, CNS, bairro ou diagnóstico…"
            aria-label="Buscar pacientes"
            className="h-12 w-full bg-transparent text-[15px] text-heading outline-none placeholder:text-muted/70"
          />
        </label>
        <select name="status" defaultValue={status} aria-label="Situação" className="campo sm:w-auto">
          <option value="">Todas as situações</option>
          {opcoes.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </select>
        <button className="btn-primario">Buscar</button>
      </div>

      <details className="group rounded-2xl border border-border bg-surface" open={filtrosAtivos > 0}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-heading">
          <IconeFiltro className="h-4 w-4 text-muted" /> Filtros
          {filtrosAtivos > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">{filtrosAtivos}</span>
          )}
        </summary>
        <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
          <div>
            <label htmlFor="modalidade" className="rotulo">Modalidade</label>
            <select id="modalidade" name="modalidade" defaultValue={modalidade} className="campo">
              <option value="">Todas</option>
              {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <label className="flex min-h-12 items-center gap-2.5 self-end text-[15px] font-medium text-heading">
            <input type="checkbox" name="lpp" value="1" defaultChecked={lpp} className="h-5 w-5 accent-[#1d6f57]" />
            Somente pacientes com LPP
          </label>
        </div>
      </details>
    </form>
  );
}
