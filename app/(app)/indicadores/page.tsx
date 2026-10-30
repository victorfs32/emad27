import { connection } from "next/server";
import { exigirUsuario } from "@/lib/auth";
import { listarObitos } from "@/lib/pacientes";
import { deslocarMes, hojeISO, mesValido, nomeDoMes } from "@/lib/opcoes";
import { PainelIndicadores } from "./painel";

export default async function Indicadores({ searchParams }: PageProps<"/indicadores">) {
  await connection();
  const sp = await searchParams;
  const hoje = hojeISO();
  const mes = mesValido(sp.mes) ? (sp.mes as string) : hoje.slice(0, 7);
  const usuario = await exigirUsuario();
  const obitos = await listarObitos(mes);

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">EMAD 27 · Gestão</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Indicadores<span className="text-accent">.</span></h1>
        <p className="m-0 mt-1 max-w-2xl text-sm text-muted">
          Indicadores do mês para enviar à gestão. Os óbitos vêm dos pacientes com situação “Óbito” e data dentro do mês.
        </p>
      </header>
      <PainelIndicadores
        key={mes}
        mes={mes}
        nomeMes={nomeDoMes(mes)}
        anterior={deslocarMes(mes, -1)}
        proximo={deslocarMes(mes, 1)}
        hoje={hoje}
        editar={usuario.perms.editar}
        carimbo={usuario.carimbo}
        obitos={obitos.doMes}
        semData={obitos.semData}
        faltaMigracao={obitos.faltaMigracao}
      />
    </div>
  );
}
