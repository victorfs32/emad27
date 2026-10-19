import { Suspense } from "react";
import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { sair } from "../actions";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<p className="p-6 text-slate-600">Carregando…</p>}>
      <Casca>{children}</Casca>
    </Suspense>
  );
}

async function Casca({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-teal-900/20 bg-teal-800 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="leading-tight">
            <span className="block text-lg font-bold">EMAD 27</span>
            <span className="block text-xs text-teal-100">Melhor em Casa</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-teal-50 sm:block">{usuario.nome}</span>
            <form action={sair}>
              <button className="rounded-lg border border-white/30 px-3 py-2 text-sm font-medium hover:bg-white/10">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">{children}</main>
    </>
  );
}
