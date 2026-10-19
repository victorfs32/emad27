"use client";

import { useTransition } from "react";

type Props = {
  /** Server Action já "amarrada" ao id, ex.: excluirProcedimento.bind(null, id) */
  acao: () => Promise<void>;
  mensagem: string;
  children: React.ReactNode;
  className?: string;
  titulo?: string;
};

/** Botão que pede confirmação antes de executar uma ação de remoção. */
export function BotaoConfirmar({ acao, mensagem, children, className, titulo }: Props) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      title={titulo}
      disabled={pendente}
      onClick={() => {
        if (window.confirm(mensagem)) iniciar(async () => { await acao(); });
      }}
      className={className ?? "rounded-xl border border-border px-3 text-sm font-semibold text-muted hover:bg-danger-soft hover:text-danger-strong disabled:opacity-60"}
      style={className ? undefined : { minHeight: 40 }}
    >
      {pendente ? "…" : children}
    </button>
  );
}
