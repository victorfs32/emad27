"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "../actions";

const caixa =
  "mb-[18px] flex items-center rounded-2xl border border-[#1E3358] bg-[#0A1830] px-3.5 transition-all focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(22,115,209,0.2)]";
const entrada = "h-12 w-full bg-transparent text-[15px] text-white outline-none placeholder:text-slate-600";

export function FormularioLogin() {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(entrar, {});
  return (
    <form action={acao}>
      <label htmlFor="email" className="mb-2 block text-sm text-slate-300">E-mail</label>
      <div className={caixa}>
        <input id="email" name="email" type="email" placeholder="Digite seu e-mail" className={entrada}
          autoComplete="username" autoCapitalize="none" required />
      </div>

      <label htmlFor="senha" className="mb-2 block text-sm text-slate-300">Senha</label>
      <div className={caixa}>
        <input id="senha" name="senha" type="password" placeholder="Digite sua senha" className={entrada}
          autoComplete="current-password" required />
      </div>

      {estado.erro && (
        <div role="alert" className="mb-3.5 rounded-xl border border-danger/35 bg-danger/12 p-3 text-sm text-[#fca5b1]">
          {estado.erro}
        </div>
      )}

      <button className="bg-brand-gradient mt-2 h-[50px] w-full rounded-2xl text-base font-bold text-white shadow-[0_10px_26px_-8px_rgba(22,115,209,0.6)] transition-all hover:-translate-y-px hover:brightness-[1.08] disabled:cursor-not-allowed disabled:opacity-70" disabled={pendente}>
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
