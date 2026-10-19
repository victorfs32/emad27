"use client";

import { useTransition } from "react";
import { excluirDispositivo } from "../../actions";

export function BotaoRemover({ id, descricao }: { id: number; descricao: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (window.confirm(`Remover ${descricao}? Use quando o paciente deixou de usar o dispositivo. A remoção fica no histórico.`))
          iniciar(async () => { await excluirDispositivo(id); });
      }}
      className="rounded-xl border border-border px-3 text-sm font-semibold text-muted hover:bg-danger-soft hover:text-danger-strong disabled:opacity-60"
      style={{ minHeight: 40 }}
    >
      {pendente ? "Removendo…" : "Remover"}
    </button>
  );
}
