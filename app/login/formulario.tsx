"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "../actions";

const caixa =
  "mb-[18px] flex items-center rounded-2xl border border-border bg-detail px-3.5 transition-all focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(29,111,87,0.2)]";
const entrada = "h-12 w-full bg-transparent text-[15px] text-heading outline-none placeholder:text-muted/70";

export function FormularioLogin() {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(entrar, {});
  return (
    <form action={acao}>
      <label htmlFor="email" className="mb-2 block text-sm font-semibold text-heading">E-mail</label>
      <div className={caixa}>
        <input id="email" name="email" type="email" placeholder="Digite seu e-mail" className={entrada}
          autoComplete="username" autoCapitalize="none" required />
      </div>

      <label htmlFor="senha" className="mb-2 block text-sm font-semibold text-heading">Senha</label>
      <div className={caixa}>
        <input id="senha" name="senha" type="password" placeholder="Digite sua senha" className={entrada}
          autoComplete="current-password" required />
      </div>

      {estado.erro && (
        <div role="alert" className="mb-3.5 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger-strong">
          {estado.erro}
        </div>
      )}

      <button className="mt-2 h-[50px] w-full rounded-2xl bg-accent text-base font-bold text-white shadow-card-md transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70" disabled={pendente}>
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
