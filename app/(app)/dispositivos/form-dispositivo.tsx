"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { salvarDispositivo } from "../../actions";
import { TIPOS_DISPOSITIVO, somarMeses } from "@/lib/opcoes";

type Inicial = {
  id: number; paciente_id: number; tipo: string; numero: string; confeccao: string;
  troca: string; proxima_troca: string; obs: string;
};
type Props = {
  /** Lista de pacientes para escolher (novo registro). Na edição o paciente é fixo. */
  pacientes?: { id: number; nome: string; prontuario: string }[];
  inicial?: Inicial;
};

const VAZIO = { tipo: "gtt", numero: "", confeccao: "", troca: "", proxima_troca: "", obs: "" };

export function FormDispositivo({ pacientes = [], inicial }: Props) {
  const [paciente, setPaciente] = useState(inicial ? String(inicial.paciente_id) : "");
  const [d, setD] = useState(inicial ? { ...inicial } : VAZIO);
  const [proximaManual, setProximaManual] = useState(Boolean(inicial?.proxima_troca));
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);
  const [pendente, iniciar] = useTransition();

  const meses = (tipo: string) => TIPOS_DISPOSITIVO.find((t) => t.valor === tipo)?.meses ?? 3;

  function mudar(campo: "tipo" | "troca", valor: string) {
    setD((p) => {
      const novo = { ...p, [campo]: valor };
      // Próxima troca é sugerida automaticamente enquanto não for editada à mão.
      if (!proximaManual && novo.troca) novo.proxima_troca = somarMeses(novo.troca, meses(novo.tipo));
      return novo;
    });
    setSalvo(false);
  }

  function enviar() {
    setErro("");
    setSalvo(false);
    iniciar(async () => {
      const r = await salvarDispositivo(inicial?.id ?? null, Number(paciente), d);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setSalvo(true);
      if (!inicial) {
        setD(VAZIO);
        setProximaManual(false);
      }
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {inicial ? (
          <input type="hidden" value={paciente} readOnly />
        ) : (
          <div className="sm:col-span-2">
            <label htmlFor="disp-paciente" className="rotulo">Paciente <span className="text-danger">*</span></label>
            <select id="disp-paciente" value={paciente} onChange={(e) => setPaciente(e.target.value)} required className="campo">
              <option value="">Selecione…</option>
              {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="disp-tipo" className="rotulo">Dispositivo <span className="text-danger">*</span></label>
          <select id="disp-tipo" value={d.tipo} onChange={(e) => mudar("tipo", e.target.value)} className="campo">
            {TIPOS_DISPOSITIVO.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="disp-numero" className="rotulo">Número</label>
          <input id="disp-numero" value={d.numero} onChange={(e) => setD({ ...d, numero: e.target.value })} placeholder="Ex.: 20, FR 16, FR 22 / 2 vias" maxLength={30} className="campo" />
        </div>
        <div>
          <label htmlFor="disp-conf" className="rotulo">Confecção</label>
          <input id="disp-conf" value={d.confeccao} onChange={(e) => setD({ ...d, confeccao: e.target.value })} placeholder="Ano, ex.: 2025" maxLength={20} className="campo" />
        </div>
        <div>
          <label htmlFor="disp-troca" className="rotulo">Troca (última)</label>
          <input id="disp-troca" type="date" value={d.troca} onChange={(e) => mudar("troca", e.target.value)} className="campo" />
        </div>
        <div>
          <label htmlFor="disp-prox" className="rotulo">Próxima troca</label>
          <input
            id="disp-prox" type="date" value={d.proxima_troca}
            onChange={(e) => { setProximaManual(true); setD({ ...d, proxima_troca: e.target.value }); setSalvo(false); }}
            className="campo"
          />
          <p className="mb-0 mt-1 text-xs text-muted">
            Sugerida automaticamente: troca + {meses(d.tipo)} {meses(d.tipo) === 1 ? "mês" : "meses"}. Você pode alterar.
          </p>
        </div>
        <div>
          <label htmlFor="disp-obs" className="rotulo">Observações</label>
          <input id="disp-obs" value={d.obs} onChange={(e) => setD({ ...d, obs: e.target.value })} maxLength={500} className="campo" />
        </div>
      </div>

      {erro && <p role="alert" className="m-0 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {salvo && <p role="status" className="m-0 rounded-2xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">Dispositivo salvo.</p>}

      <div className="flex flex-wrap gap-2">
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : inicial ? "Salvar alterações" : "Registrar dispositivo"}</button>
        {inicial && <Link href="/dispositivos" className="btn-secundario">{salvo ? "Voltar" : "Cancelar"}</Link>}
      </div>
    </form>
  );
}
