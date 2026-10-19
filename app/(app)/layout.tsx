import { Suspense } from "react";
import { exigirUsuario } from "@/lib/auth";
import { resumoPainel } from "@/lib/pacientes";
import { Migalhas } from "./migalhas";
import { Navegacao } from "./navegacao";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Carregando…</p>}>
      <Casca>{children}</Casca>
    </Suspense>
  );
}

async function Casca({ children }: { children: React.ReactNode }) {
  const [usuario, resumo] = await Promise.all([exigirUsuario(), resumoPainel()]);
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <Navegacao
        nome={usuario.nome}
        cadastrados={resumo.cadastrados}
        visitas={resumo.visitas7dias}
        admin={usuario.perms.admin}
        arquivados={resumo.arquivados}
      />
      <div className="min-w-0 flex-1">
        <Migalhas />
        <main className="mx-auto w-full max-w-[1100px] px-4 py-5 lg:px-8 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
