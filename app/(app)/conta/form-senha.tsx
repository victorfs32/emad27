"use client";

import { useState, useTransition } from "react";
import { alterarMinhaSenha } from "../../actions";

export function FormSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [pendente, iniciar] = useTransition();

  function enviar() {
    setErro("");
    setOk(false);
    iniciar(async () => {
      const r = await alterarMinhaSenha({ atual, nova, confirmar });
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setOk(true);
      setAtual("");
      setNova("");
      setConfirmar("");
    });
  }

  const tipo = mostrar ? "text" : "password";
  return (
    <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="grid gap-4">
      <div>
        <label htmlFor="sn-atual" className="rotulo">Senha atual</label>
        <input id="sn-atual" type={tipo} value={atual} onChange={(e) => setAtual(e.target.value)} required autoComplete="current-password" className="campo" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sn-nova" className="rotulo">Nova senha</label>
          <input id="sn-nova" type={tipo} value={nova} onChange={(e) => setNova(e.target.value)} required autoComplete="new-password" className="campo" />
          <p className="mb-0 mt-1 text-xs text-muted">Mínimo de 10 caracteres, com letras e números.</p>
        </div>
        <div>
          <label htmlFor="sn-conf" className="rotulo">Repita a nova senha</label>
          <input id="sn-conf" type={tipo} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required autoComplete="new-password" className="campo" />
        </div>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-heading">
        <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} className="h-5 w-5 accent-[#1d6f57]" />
        Mostrar as senhas
      </label>

      {erro && <p role="alert" className="m-0 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {ok && <p role="status" className="m-0 rounded-2xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">Senha alterada com sucesso.</p>}

      <div><button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Alterar senha"}</button></div>
    </form>
  );
}
