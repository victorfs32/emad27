import { connection } from "next/server";
import { exigirUsuario } from "@/lib/auth";
import { obterDiario } from "@/lib/diario";
import { listarPacientesBasico } from "@/lib/pacientes";
import { agoraLocalISO, hojeISO, nomeDoMes } from "@/lib/opcoes";
import { PainelDiario } from "./painel";

export default async function Diario({ searchParams }: PageProps<"/diario">) {
  await connection();
  const sp = await searchParams;
  const hoje = hojeISO();
  const data = typeof sp.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) && sp.data <= hoje ? sp.data : hoje;
  const [usuario, pacientes, diario] = await Promise.all([exigirUsuario(), listarPacientesBasico(), obterDiario(data)]);

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">Ocorrência - EMAD 27</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Diário de atendimentos<span className="text-accent">.</span></h1>
        <p className="m-0 mt-1 max-w-2xl text-sm text-muted">
          A folha do dia no sistema: equipe de manhã e de tarde, cada atendimento com sinais vitais, profissionais e procedimentos,
          e as intercorrências. Ao registrar um paciente cadastrado, a visita do dia já entra no controle de visitas.
        </p>
      </header>
      <PainelDiario
        key={`${data}-${diario.atendimentos.map((a) => a.id).join(".")}`}
        data={data}
        hoje={hoje}
        turnoAgora={Number(agoraLocalISO().slice(11, 13)) < 12 ? "manha" : "tarde"}
        nomeMes={nomeDoMes(data.slice(0, 7))}
        editar={usuario.perms.editar && !diario.faltaMigracao}
        faltaMigracao={diario.faltaMigracao}
        dia={diario.dia}
        atendimentos={diario.atendimentos}
        pacientes={pacientes}
      />
    </div>
  );
}
