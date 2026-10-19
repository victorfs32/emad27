"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { sair } from "../actions";
import {
  IconeEscudo as IconeEquipe, IconeDispositivo, IconeLesao, IconeArquivo, IconeCalendario, IconeCasa, IconeEscudo, IconeFechar, IconeMais,
  IconeMenu, IconePessoas, IconeSair,
} from "./icones";

type Props = {
  nome: string; cadastrados: number; dispositivos: number; lesoes: number; visitas: number; arquivados: number; admin: boolean;
};

function Marca() {
  return (
    <span className="flex items-center gap-3 text-heading">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
        <IconeMais className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-[22px] font-bold tracking-tight">EMAD 27</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
          Atenção domiciliar
        </span>
      </span>
    </span>
  );
}

export function Navegacao({ nome, cadastrados, dispositivos, lesoes, visitas, arquivados, admin }: Props) {
  const [aberto, setAberto] = useState(false);
  const rota = usePathname();

  const itens = [
    { href: "/", rotulo: "Pacientes", icone: IconePessoas, n: cadastrados, ativo: rota === "/" || rota.startsWith("/pacientes") },
    { href: "/dispositivos", rotulo: "Dispositivos", icone: IconeDispositivo, n: dispositivos as number | null, ativo: rota === "/dispositivos" },
    { href: "/lesoes", rotulo: "Lesões", icone: IconeLesao, n: lesoes as number | null, ativo: rota === "/lesoes" },
    { href: "/proximas-visitas", rotulo: "Próximas visitas", icone: IconeCalendario, n: visitas, ativo: rota === "/proximas-visitas" },
    { href: "/arquivados", rotulo: "Arquivados", icone: IconeArquivo, n: arquivados, ativo: rota === "/arquivados" },
    ...(admin ? [{ href: "/equipe", rotulo: "Equipe", icone: IconeEquipe, n: null as number | null, ativo: rota === "/equipe" }] : []),
  ];

  return (
    <>
      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-2.5 lg:hidden">
        <Link href="/"><Marca /></Link>
        <button
          onClick={() => setAberto(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-heading"
          aria-label="Abrir menu"
        >
          <IconeMenu />
        </button>
      </header>

      {aberto && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setAberto(false)} aria-hidden="true" />
      )}

      {/* Menu lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-6 overflow-y-auto border-r border-border bg-gradient-to-b from-sidebar-start to-sidebar-end p-6 text-heading transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Link href="/" onClick={() => setAberto(false)}><Marca /></Link>
          <button onClick={() => setAberto(false)} className="rounded-lg p-2 text-sidebar-muted lg:hidden" aria-label="Fechar menu">
            <IconeFechar />
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <IconeCasa />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">EMAD 27</span>
            <span className="block text-xs text-sidebar-muted">Programa Melhor em Casa</span>
          </span>
        </div>

        <nav aria-label="Principal">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
            Área de trabalho
          </p>
          <ul className="flex flex-col gap-1.5">
            {itens.map(({ href, rotulo, icone: Icone, n, ativo }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setAberto(false)}
                  aria-current={ativo ? "page" : undefined}
                  className={`relative flex min-h-12 items-center gap-3 rounded-[13px] px-3.5 font-medium transition-colors ${
                    ativo
                      ? "bg-secondary font-semibold text-heading"
                      : "text-sidebar-muted hover:bg-secondary hover:text-heading"
                  }`}
                >
                  <Icone className="h-5 w-5" />
                  <span className="flex-1">{rotulo}</span>
                  {n !== null && (
                    <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${ativo ? "bg-surface text-accent" : "bg-secondary"}`}>{n}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="rounded-2xl bg-accent-soft p-4 text-sm">
          <IconeEscudo className="h-5 w-5 text-accent" />
          <p className="mt-2 font-semibold">Seu espaço de cuidado</p>
          <p className="mt-1 text-sidebar-muted">Acesso privado, vinculado à sua conta.</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Ambiente privado
          </p>
        </div>

        <div className="mt-auto flex items-center gap-3 border-t border-border pt-[18px]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-base font-bold text-accent">
            {nome.trim().charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <strong className="truncate text-sm">{nome}</strong>
            <span className="text-xs text-muted">Equipe</span>
          </span>
          <form action={sair}>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl text-sidebar-muted hover:bg-secondary hover:text-heading" aria-label="Sair">
              <IconeSair />
            </button>
          </form>
        </div>
      </aside>

    </>
  );
}
