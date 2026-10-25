"use client";

import { useState, useTransition } from "react";
import { salvarMeuCadastro } from "../../actions";
import { CAMPOS_PROFISSIONAL, problemaNaIdentificacao, type IdentificacaoProfissional } from "@/lib/profissional";
import { formatarCns, formatarCpf, soDigitos } from "@/lib/validacao";

type Props = { nome: string; inicial: IdentificacaoProfissional };

const DICAS: Record<keyof IdentificacaoProfissional, string> = {
  cpf: "11 dígitos",
  cns: "15 dígitos (cartão SUS)",
  cbo: "6 dígitos (ocupação)",
  cnes: "7 dígitos (estabelecimento)",
  ine: "10 dígitos (equipe)",
};

/** Nome e identificação profissional do próprio usuário (CPF, CNS, CBO, CNES e INE). */
export function FormCadastro({ nome: nome0, inicial }: Props) {
  const [nome, setNome] = useState(nome0);
  const [ident, setIdent] = useState<IdentificacaoProfissional>(inicial);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [pendente, iniciar] = useTransition();

  const mostrar = (k: keyof IdentificacaoProfissional) => (k === "cpf" ? formatarCpf(ident.cpf) : k === "cns" ? formatarCns(ident.cns) : ident[k]);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOk("");
    const problema = problemaNaIdentificacao(ident);
    if (problema) {
      setErro(problema);
      return;
    }
    iniciar(async () => {
      const r = await salvarMeuCadastro(nome, ident);
      if (r.erro) setErro(r.erro);
      else setOk("Cadastro atualizado.");
    });
  }

  return (
    <form onSubmit={salvar} className="grid gap-4">
      <div>
        <label htmlFor="cad-nome" className="rotulo">Nome <span className="text-danger">*</span></label>
        <input id="cad-nome" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={120} className="campo" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS_PROFISSIONAL.map((c) => (
          <div key={c.chave}>
            <label htmlFor={`cad-${c.chave}`} className="rotulo">{c.rotulo}</label>
            <input
              id={`cad-${c.chave}`} inputMode="numeric" autoComplete="off" value={mostrar(c.chave)}
              onChange={(e) => setIdent((x) => ({ ...x, [c.chave]: soDigitos(e.target.value).slice(0, c.digitos) }))}
              className="campo"
            />
            <p className="mb-0 mt-1 text-xs text-muted">{DICAS[c.chave]}</p>
          </div>
        ))}
      </div>
      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {ok && <p role="status" className="m-0 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{ok}</p>}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>{pendente ? "Salvando…" : "Salvar cadastro"}</button>
    </form>
  );
}
