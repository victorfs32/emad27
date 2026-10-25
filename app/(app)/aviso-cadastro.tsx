"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";

const CHAVE = "emad27-aviso-cadastro";
const EVENTO = "emad27-aviso-cadastro-adiado";

function assinar(aviso: () => void) {
  window.addEventListener(EVENTO, aviso);
  return () => window.removeEventListener(EVENTO, aviso);
}
function lerAdiado() {
  try {
    return sessionStorage.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
}

/** Aviso para quem ainda não informou CPF, CNS, CBO, CNES ou INE. Pode ser adiado até a próxima entrada no sistema. */
export function AvisoCadastro({ faltando }: { faltando: string[] }) {
  const rota = usePathname();
  // no servidor e na hidratação o aviso fica oculto, para não piscar quando já foi adiado
  const adiado = useSyncExternalStore(assinar, lerAdiado, () => true);
  const botao = useRef<HTMLAnchorElement>(null);

  const aberto = faltando.length > 0 && !adiado && rota !== "/conta";
  useEffect(() => {
    if (aberto) botao.current?.focus();
  }, [aberto]);

  if (!aberto) return null;

  function depois() {
    try {
      sessionStorage.setItem(CHAVE, "1");
    } catch {
      /* sem armazenamento: o aviso volta na próxima página */
    }
    window.dispatchEvent(new Event(EVENTO));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4" onKeyDown={(e) => e.key === "Escape" && depois()}>
      <div role="dialog" aria-modal="true" aria-labelledby="aviso-cadastro-titulo" className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-card-lg">
        <h2 id="aviso-cadastro-titulo" className="m-0 text-xl font-extrabold text-heading">Atualize o seu cadastro</h2>
        <p className="mb-0 mt-2 text-sm text-muted">
          Faltam dados da sua identificação profissional. Eles saem preenchidos nos documentos e fichas que você gera.
        </p>
        <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
          {faltando.map((c) => <li key={c} className="rounded-lg bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning-strong">{c}</li>)}
        </ul>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link ref={botao} href="/conta" className="btn-primario text-center">Atualizar agora</Link>
          <button type="button" onClick={depois} className="btn-secundario">Depois</button>
        </div>
      </div>
    </div>
  );
}
