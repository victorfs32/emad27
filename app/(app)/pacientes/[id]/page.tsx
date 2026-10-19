import Link from "next/link";
import { notFound } from "next/navigation";
import { listarEvolucoes, obterPaciente } from "@/lib/pacientes";
import { SEXOS, TIPOS_EVOLUCAO, calcularIdade, formatarData } from "@/lib/opcoes";
import { registrarEvolucao } from "../../../actions";
import { SeloStatus } from "../../selo-status";

function Dado({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-slate-900">{valor || "—"}</dd>
    </div>
  );
}

function formatarCpf(c: string | null) {
  return c && c.length === 11 ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : c;
}

export default async function Ficha({ params }: PageProps<"/pacientes/[id]">) {
  const { id } = await params;
  const paciente = await obterPaciente(Number(id));
  if (!paciente) notFound();
  const evolucoes = await listarEvolucoes(paciente.id);

  const idade = calcularIdade(paciente.data_nascimento);
  const hoje = new Date().toISOString().slice(0, 10);
  const sexo = SEXOS.find((s) => s.valor === paciente.sexo)?.rotulo;
  const encerrado = ["alta", "obito"].includes(paciente.status ?? "");

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-block text-sm font-medium text-teal-800 hover:underline">← Voltar à lista</Link>

      <div className="cartao flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{paciente.nome}</h1>
          <p className="mt-1 text-slate-600">
            {[idade !== null && `${idade} anos`, sexo, paciente.modalidade].filter(Boolean).join(" · ") || "—"}
          </p>
          <div className="mt-2"><SeloStatus status={paciente.status} /></div>
        </div>
        <Link href={`/pacientes/${paciente.id}/editar`} className="btn-secundario">Editar</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="cartao">
          <h2 className="mb-3 text-lg font-semibold">Identificação e contato</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Dado rotulo="Nascimento" valor={formatarData(paciente.data_nascimento)} />
            <Dado rotulo="CPF" valor={formatarCpf(paciente.cpf)} />
            <Dado rotulo="Cartão SUS" valor={paciente.cns} />
            <Dado rotulo="Telefone" valor={paciente.telefone} />
            <Dado rotulo="Cuidador / responsável" valor={paciente.contato_nome} />
            <Dado rotulo="Telefone do cuidador" valor={paciente.contato_telefone} />
            <div className="sm:col-span-2">
              <Dado
                rotulo="Endereço"
                valor={[paciente.endereco, paciente.bairro, paciente.municipio].filter(Boolean).join(" — ")}
              />
            </div>
            <div className="sm:col-span-2"><Dado rotulo="Ponto de referência" valor={paciente.referencia} /></div>
          </dl>
        </section>

        <section className="cartao">
          <h2 className="mb-3 text-lg font-semibold">Dados clínicos e do programa</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Dado rotulo="Diagnóstico principal" valor={paciente.diagnostico} /></div>
            <Dado rotulo="CID-10" valor={paciente.cid} />
            <Dado rotulo="Origem" valor={paciente.origem} />
            <Dado rotulo="Admissão" valor={formatarData(paciente.data_admissao)} />
            <Dado rotulo="Modalidade" valor={paciente.modalidade} />
            <div className="sm:col-span-2"><Dado rotulo="Dispositivos / cuidados especiais" valor={paciente.dispositivos} /></div>
            {encerrado && (
              <>
                <Dado rotulo="Data de saída" valor={formatarData(paciente.data_saida)} />
                <Dado rotulo="Motivo" valor={paciente.motivo_saida} />
              </>
            )}
            {paciente.observacoes && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Observações</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-slate-900">{paciente.observacoes}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <section className="cartao">
        <h2 className="mb-3 text-lg font-semibold">Acompanhamento</h2>
        <form action={registrarEvolucao.bind(null, paciente.id)} className="space-y-3 rounded-lg bg-slate-50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="data" className="rotulo">Data</label>
              <input id="data" name="data" type="date" defaultValue={hoje} max={hoje} required className="campo" />
            </div>
            <div>
              <label htmlFor="tipo" className="rotulo">Tipo</label>
              <select id="tipo" name="tipo" className="campo">
                {TIPOS_EVOLUCAO.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="texto" className="rotulo">Registro</label>
            <textarea id="texto" name="texto" rows={3} required className="campo" placeholder="Descreva o atendimento, evolução ou intercorrência" />
          </div>
          <button className="btn-primario w-full sm:w-auto">Registrar</button>
        </form>

        {evolucoes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Nenhum registro de acompanhamento ainda.</p>
        ) : (
          <ol className="mt-4 space-y-3 border-l-2 border-teal-200 pl-4">
            {evolucoes.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-teal-600" />
                <p className="text-sm text-slate-600">
                  <strong className="text-slate-900">{formatarData(e.data)}</strong> · {e.tipo} · {e.autor}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap">{e.texto}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
