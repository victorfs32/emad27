import { connection } from "next/server";
import { exigirUsuario } from "@/lib/auth";
import { dadosAgenda } from "@/lib/pacientes";
import { deslocarMes, hojeISO, mesValido, nomeDoMes } from "@/lib/opcoes";
import { AgendaMensal } from "./agenda-mensal";

const numero = (v: unknown, padrao: number, min: number, max: number) => {
  const n = typeof v === "string" && /^\d+$/.test(v) ? Number(v) : padrao;
  return Math.min(max, Math.max(min, n));
};

export default async function Agenda({ searchParams }: PageProps<"/agenda">) {
  await connection();
  const sp = await searchParams;
  const hoje = hojeISO();
  const mes = mesValido(sp.mes) ? (sp.mes as string) : hoje.slice(0, 7);
  // Ajustes ficam no endereço da página: recarregar ou compartilhar o link mantém a mesma agenda.
  const meta = numero(sp.meta, 120, 0, 600);
  const maxPorDia = numero(sp.max, 6, 1, 20);
  const diasSemana = typeof sp.dias === "string" && /^[0-6]{1,7}$/.test(sp.dias) ? [...new Set(sp.dias.split("").map(Number))] : [1, 2, 3, 4, 5];
  const folgas = typeof sp.folgas === "string"
    ? sp.folgas.split(",").filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d.startsWith(mes))
    : [];

  const usuario = await exigirUsuario();
  const { pacientes, visitas } = await dadosAgenda(mes);

  return (
    <div className="grid gap-6">
      <header>
        <div>
          <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">EMAD 27 · Planejamento</p>
          <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Agenda do mês<span className="text-accent">.</span></h1>
          <p className="m-0 mt-1 max-w-2xl text-sm text-muted">
            Gerada automaticamente: cada dia reúne pacientes do mesmo bairro, ninguém se repete até todos serem visitados e a meta do mês é
            dividida pelos dias de atendimento. Ao registrar visitas, a agenda dos próximos dias se ajusta sozinha.
          </p>
        </div>
      </header>

      <AgendaMensal
        key={mes}
        pacientes={pacientes}
        visitas={visitas}
        mes={mes}
        nomeMes={nomeDoMes(mes)}
        anterior={deslocarMes(mes, -1)}
        proximo={deslocarMes(mes, 1)}
        hoje={hoje}
        editar={usuario.perms.editar}
        inicial={{ meta, maxPorDia, diasSemana, folgas }}
      />
    </div>
  );
}
