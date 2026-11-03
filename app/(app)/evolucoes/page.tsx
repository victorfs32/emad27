import Link from "next/link";
import { connection } from "next/server";
import { exigirUsuario } from "@/lib/auth";
import { categoriaPorCargo } from "@/lib/evolucao-regras";
import { listarEvolucoesClinicas, pacienteParaEvolucao } from "@/lib/evolucoes";
import { listarPacientesBasico } from "@/lib/pacientes";
import { calcularIdade, formatarData, hojeISO } from "@/lib/opcoes";
import { formatarCns } from "@/lib/validacao";
import { EscolherPaciente } from "./escolher-paciente";
import { PainelEvolucoes } from "./painel";

export default async function Evolucoes({ searchParams }: PageProps<"/evolucoes">) {
  await connection();
  const sp = await searchParams;
  const id = typeof sp.paciente === "string" && /^\d+$/.test(sp.paciente) ? Number(sp.paciente) : null;
  const [usuario, pacientes] = await Promise.all([exigirUsuario(), listarPacientesBasico()]);
  const categoria = categoriaPorCargo(usuario.cargo);
  const paciente = id ? await pacienteParaEvolucao(id) : null;
  const evolucoes = paciente ? await listarEvolucoesClinicas(paciente.id) : null;

  const idade = paciente ? calcularIdade(paciente.data_nascimento) : null;
  const diagnostico = paciente
    ? [...paciente.diagnosticos].sort((a, b) => Number(b.principal) - Number(a.principal))
        .map((d) => (d.descricao ? `${d.cid} - ${d.descricao}` : d.cid)).join("; ")
    : "";

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">Prontuário</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Evolução clínica<span className="text-accent">.</span></h1>
        <p className="m-0 mt-1 max-w-2xl text-sm text-muted">
          Evoluções médicas e de enfermagem registradas digitalmente, com nome, cargo e registro de quem escreveu.
          Depois de salva, a evolução fica no histórico do paciente e não pode ser alterada.
        </p>
      </header>

      <EscolherPaciente pacientes={pacientes} atual={paciente?.id ?? null} />

      {!categoria && (
        <p className="m-0 rounded-2xl bg-detail px-4 py-3 text-sm text-heading">
          Você pode ler as evoluções. Para escrever, o cargo cadastrado em <Link href="/conta" className="font-semibold text-accent underline">Conta</Link> precisa
          ser de médico(a) ou enfermeiro(a){usuario.cargo ? ` (hoje está “${usuario.cargo}”)` : " (hoje está em branco)"}.
        </p>
      )}

      {id && !paciente && <p className="cartao m-0 text-sm text-muted">Paciente não encontrado.</p>}

      {paciente && evolucoes && (
        <PainelEvolucoes
          key={paciente.id}
          pacienteId={paciente.id}
          pacientePdf={{
            nome: paciente.nome, prontuario: paciente.prontuario, cns: paciente.cns ? formatarCns(paciente.cns) : "",
            nascimento: paciente.data_nascimento ? formatarData(paciente.data_nascimento) : "", idade: idade === null ? "" : `${idade} anos`,
            sexo: paciente.sexo === "F" ? "Feminino" : paciente.sexo === "M" ? "Masculino" : "", diagnostico,
          }}
          evolucoes={evolucoes.lista}
          faltaMigracao={evolucoes.faltaMigracao}
          categoria={categoria}
          autor={{ nome: usuario.nome, cargo: usuario.cargo, registro: usuario.registro }}
          hoje={hojeISO()}
        />
      )}
    </div>
  );
}
