"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { excluirPaciente } from "../../../actions";

const normalizar = (t: string) => t.trim().replace(/\s+/g, " ").toLowerCase();

/** Exclusão definitiva do paciente (só administradores): pede o nome digitado e o motivo. */
export function BotaoExcluirPaciente({ pacienteId, nome, voltarPara }: { pacienteId: number; nome: string; voltarPara: string }) {
  const router = useRouter();
  const caixa = useRef<HTMLDialogElement>(null);
  const [aberto, setAberto] = useState(false);
  const [digitado, setDigitado] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const confere = normalizar(digitado) === normalizar(nome);
  const pronto = confere && motivo.trim().length >= 5;

  useEffect(() => {
    const d = caixa.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  function abrir() {
    setDigitado("");
    setMotivo("");
    setErro("");
    setAberto(true);
  }

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!pronto || pendente) return;
    setErro("");
    iniciar(async () => {
      const r = await excluirPaciente(pacienteId, digitado, motivo);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setAberto(false);
      router.replace(voltarPara);
    });
  }

  return (
    <>
      <button
        type="button" onClick={abrir}
        className="inline-flex min-h-11 items-center rounded-2xl border border-white/35 px-5 text-sm font-semibold text-white hover:bg-red-700/40"
      >
        Excluir paciente
      </button>

      <dialog
        ref={caixa} onClose={() => setAberto(false)} aria-labelledby="excluir-titulo"
        className="m-auto w-[min(92vw,480px)] rounded-3xl border border-border bg-surface p-0 text-heading shadow-card-lg backdrop:bg-black/50"
      >
        <form onSubmit={confirmar} className="grid gap-4 p-6">
          <h2 id="excluir-titulo" className="m-0 text-lg font-bold text-danger-strong">Excluir paciente do programa</h2>
          <div className="m-0 grid gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-strong">
            <p className="m-0 font-semibold">Esta ação não pode ser desfeita.</p>
            <p className="m-0">
              Serão apagados o cadastro e <strong>todo o histórico</strong> de <strong>{nome}</strong>: visitas, evoluções,
              prescrições, dispositivos, lesões e documentos.
            </p>
            <p className="m-0">Se o paciente teve alta, transferência ou óbito, não exclua: mude a situação e ele vai para Arquivados.</p>
          </div>
          <div>
            <label htmlFor="excluir-nome" className="rotulo">Para confirmar, digite o nome do paciente</label>
            <input
              id="excluir-nome" value={digitado} onChange={(e) => setDigitado(e.target.value)} placeholder={nome}
              autoComplete="off" spellCheck={false} className="campo"
            />
            {digitado && !confere && <p className="m-0 mt-1 text-xs text-muted">O nome ainda não confere.</p>}
          </div>
          <div>
            <label htmlFor="excluir-motivo" className="rotulo">Motivo da exclusão</label>
            <input
              id="excluir-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500}
              placeholder="Ex.: cadastro duplicado, cadastrado por engano" className="campo"
            />
          </div>
          {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setAberto(false)} disabled={pendente} className="btn-secundario">Cancelar</button>
            <button
              type="submit" disabled={!pronto || pendente}
              className="inline-flex min-h-11 items-center rounded-2xl bg-danger-strong px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendente ? "Excluindo…" : "Excluir definitivamente"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
