"use client";

import { useState, useTransition } from "react";
import { cadastrarUsuario } from "../../actions";
import { problemaNaSenha } from "@/lib/validacao";

// Sem caracteres que se confundem (0/O, 1/l/I) para facilitar passar a senha por mensagem.
const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function gerarSenha() {
  for (;;) {
    const v = new Uint32Array(12);
    crypto.getRandomValues(v);
    const s = Array.from(v, (n) => ALFABETO[n % ALFABETO.length]).join("");
    if (/[A-Za-z]/.test(s) && /\d/.test(s)) return s;
  }
}

type Criado = { nome: string; email: string; senha: string; perfil: string };

export function FormNovoUsuario() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState("visualizacao");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState("");
  const [criado, setCriado] = useState<Criado | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciar] = useTransition();

  function enviar() {
    setErro("");
    setCriado(null);
    setCopiado(false);
    const problema = problemaNaSenha(senha);
    if (problema) {
      setErro(problema);
      return;
    }
    iniciar(async () => {
      const r = await cadastrarUsuario({ nome, email, senha, perfil });
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setCriado({ nome: nome.trim(), email: email.trim().toLowerCase(), senha, perfil });
      setNome("");
      setEmail("");
      setSenha("");
      setPerfil("visualizacao");
      setMostrar(false);
    });
  }

  async function copiar() {
    if (!criado) return;
    const texto = [
      "EMAD 27 — acesso ao sistema",
      `Endereço: ${window.location.origin}`,
      `E-mail: ${criado.email}`,
      `Senha provisória: ${criado.senha}`,
      "",
      "Ao entrar pela primeira vez, troque a senha em “Minha conta” (clique no seu nome, no canto do menu).",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="grid gap-4">
      {criado && (
        <div role="status" className="grid gap-3 rounded-2xl border border-success/40 bg-success-soft p-4 text-success-strong">
          <p className="m-0 font-bold">Usuário cadastrado: {criado.nome}</p>
          <dl className="m-0 grid gap-1 text-sm">
            <div className="flex flex-wrap gap-x-2"><dt className="font-semibold">E-mail:</dt><dd className="m-0 break-all">{criado.email}</dd></div>
            <div className="flex flex-wrap gap-x-2"><dt className="font-semibold">Senha provisória:</dt><dd className="m-0 font-mono font-bold">{criado.senha}</dd></div>
            <div className="flex flex-wrap gap-x-2"><dt className="font-semibold">Perfil:</dt><dd className="m-0">{criado.perfil === "admin" ? "Administrador" : "Somente visualização"}</dd></div>
          </dl>
          <p className="m-0 text-sm">
            Passe o e-mail e a senha para a pessoa. Esta senha não será mostrada de novo: copie agora. Peça para trocá-la em “Minha conta” no primeiro acesso.
          </p>
          <div><button type="button" onClick={copiar} className="btn-secundario !min-h-11 !text-sm">{copiado ? "Copiado!" : "Copiar dados de acesso"}</button></div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nu-nome" className="rotulo">Nome <span className="text-danger">*</span></label>
            <input id="nu-nome" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={120} autoComplete="off" placeholder="Ex.: Maria Silva — Enfermeira" className="campo" />
          </div>
          <div>
            <label htmlFor="nu-email" className="rotulo">E-mail (será o login) <span className="text-danger">*</span></label>
            <input id="nu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" autoCapitalize="none" className="campo" />
          </div>
          <div>
            <label htmlFor="nu-senha" className="rotulo">Senha provisória <span className="text-danger">*</span></label>
            <div className="flex gap-2">
              <input
                id="nu-senha" type={mostrar ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)}
                required autoComplete="new-password" className="campo" aria-describedby="nu-senha-dica"
              />
              <button type="button" onClick={() => setMostrar((m) => !m)} className="btn-secundario !min-h-12 !px-3 !text-sm" aria-pressed={mostrar}>
                {mostrar ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => { setSenha(gerarSenha()); setMostrar(true); }} className="rounded-xl border border-accent-soft-strong bg-accent-soft px-3 text-sm font-semibold text-accent hover:bg-accent hover:text-white" style={{ minHeight: 40 }}>
                Gerar senha segura
              </button>
              <span id="nu-senha-dica" className="text-xs text-muted">Mínimo de 10 caracteres, com letras e números.</span>
            </div>
          </div>
          <div>
            <label htmlFor="nu-perfil" className="rotulo">Perfil de acesso</label>
            <select id="nu-perfil" value={perfil} onChange={(e) => setPerfil(e.target.value)} className="campo">
              <option value="visualizacao">Somente visualização</option>
              <option value="admin">Administrador</option>
            </select>
            <p className="mb-0 mt-1 text-xs text-muted">
              {perfil === "admin"
                ? "Pode cadastrar pacientes, editar, exportar e gerenciar a equipe."
                : "Só consulta as fichas e as listas. Não cadastra nem altera nada (perfil recomendado)."}
            </p>
          </div>
        </div>

        {erro && <p role="alert" className="m-0 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}

        <div><button className="btn-primario" disabled={pendente}>{pendente ? "Cadastrando…" : "Cadastrar usuário"}</button></div>
      </form>
    </div>
  );
}
