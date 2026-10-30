import { connection } from "next/server";
import { exigirUsuario } from "@/lib/auth";
import { listarAd1, listarAltas, listarBuscaAtiva, listarObitos, listarReinternacoes } from "@/lib/indicadores";
import { listarPacientesBasico } from "@/lib/pacientes";
import { deslocarMes, hojeISO, limitesDoMes, mesValido, nomeDoMes } from "@/lib/opcoes";
import { PainelIndicadores } from "./painel";

export default async function Indicadores({ searchParams }: PageProps<"/indicadores">) {
  await connection();
  const sp = await searchParams;
  const hoje = hojeISO();
  const mes = mesValido(sp.mes) ? (sp.mes as string) : hoje.slice(0, 7);
  const usuario = await exigirUsuario();
  const [obitos, ad1, reinternacoes, buscaAtiva, altas, pacientes] = await Promise.all([
    listarObitos(mes), listarAd1(), listarReinternacoes(mes), listarBuscaAtiva(mes), listarAltas(mes), listarPacientesBasico(),
  ]);

  // Registros novos (reinternação, busca ativa) ficam dentro do mês escolhido e nunca no futuro.
  const { inicio, fim } = limitesDoMes(mes);
  const ultimoDia = new Date(Date.parse(`${fim}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
  const max = ultimoDia < hoje ? ultimoDia : hoje;
  const dataPadrao = hoje >= inicio && hoje <= ultimoDia ? hoje : max >= inicio ? max : inicio;

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">EMAD 27 · Gestão</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Indicadores<span className="text-accent">.</span></h1>
        <p className="m-0 mt-1 max-w-2xl text-sm text-muted">
          Quadros do mês para enviar à gestão, cada um com o seu PDF. Óbitos, altas e acompanhamento AD1 vêm do cadastro dos pacientes;
          reinternações e busca ativa são registradas aqui.
        </p>
      </header>
      <PainelIndicadores
        key={mes}
        comum={{ emad: "27", mes, nomeMes: nomeDoMes(mes), hoje, carimbo: usuario.carimbo }}
        anterior={deslocarMes(mes, -1)}
        proximo={deslocarMes(mes, 1)}
        editar={usuario.perms.editar}
        faltaMigracao={obitos.faltaMigracao || ad1.faltaMigracao || reinternacoes.faltaMigracao || buscaAtiva.faltaMigracao || altas.faltaMigracao}
        dataPadrao={dataPadrao}
        limite={{ min: inicio, max }}
        pacientes={pacientes}
        obitos={obitos.doMes}
        obitosSemData={obitos.semData}
        ad1={ad1.lista}
        reinternacoes={reinternacoes.lista}
        buscaAtiva={buscaAtiva.lista}
        altas={altas.lista}
      />
    </div>
  );
}
