import Link from "next/link";
import { notFound } from "next/navigation";
import { listarEvolucoes, obterPaciente } from "@/lib/pacientes";
import { SEXOS, TIPOS_EVOLUCAO, calcularIdade, formatarData, hojeISO } from "@/lib/opcoes";
import { agendarVisita, registrarEvolucao } from "../../../actions";
import { IconeCalendario } from "../../icones";
import { SeloStatus } from "../../selo-status";

function Dado({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">{rotulo}</dt>
      <dd className="mt-1 break-words text-heading">{valor || "—"}</dd>
    </div>
  );
}

const Secao = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="cartao">
    <h2 className="mb-4 mt-0 text-base font-bold text-heading">{titulo}</h2>
    {children}
  </section>
);

function formatarCpf(c: string | null) {
  return c && c.length === 11 ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : c;
}

export default async function Ficha({ params }: PageProps<"/pacientes/[id]">) {
  const { id } = await params;
  const paciente = await obterPaciente(Number(id));
  if (!paciente) notFound();
  const evolucoes = await listarEvolucoes(paciente.id);

  const idade = calcularIdade(paciente.data_nascimento);
  const hoje = hojeISO();
  const sexo = SEXOS.find((s) => s.valor === paciente.sexo)?.rotulo;
  const encerrado = ["alta", "obito"].includes(paciente.status);
  const atrasada = paciente.proxima_visita && paciente.proxima_visita < hoje;

  return (
    <div className="grid gap-5">
      <Link href="/" className="text-sm font-semibold text-accent hover:underline">← Voltar à lista</Link>

      <div className="bg-brand-gradient flex flex-wrap items-start justify-between gap-4 rounded-[28px] p-6 text-white shadow-[0_18px_40px_-16px_rgba(22,115,209,0.55)]">
        <div>
          <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/70">Ficha do paciente</p>
          <h1 className="m-0 mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.02em]">{paciente.nome}</h1>
          <p className="mb-0 mt-1.5 text-sm text-white/80">
            {[idade !== null && `${idade} anos`, sexo, paciente.modalidade].filter(Boolean).join(" · ") || "—"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SeloStatus status={paciente.status} />
            {paciente.possui_lpp && (
              <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger-strong">LPP</span>
            )}
          </div>
        </div>
        <Link
          href={`/pacientes/${paciente.id}/editar`}
          className="inline-flex min-h-11 items-center rounded-2xl border border-white/35 px-5 text-sm font-semibold text-white hover:bg-white/10"
        >
          Editar
        </Link>
      </div>

      {!encerrado && (
        <section className="cartao flex flex-wrap items-center gap-4">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-accent-soft text-accent">
            <IconeCalendario />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-heading">
              Próxima visita: {formatarData(paciente.proxima_visita)}
            </strong>
            <small className={atrasada ? "font-semibold text-danger-strong" : "text-muted"}>
              {atrasada ? "Visita atrasada" : paciente.proxima_visita ? "Agendada" : "Nenhuma visita agendada"}
            </small>
          </div>
          <form action={agendarVisita.bind(null, paciente.id)} className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              name="proxima_visita"
              defaultValue={paciente.proxima_visita ?? ""}
              aria-label="Data da próxima visita"
              className="campo !w-auto"
            />
            <button className="btn-secundario !min-h-12">Salvar</button>
          </form>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Secao titulo="Identificação e contato">
          <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Dado rotulo="Nascimento" valor={formatarData(paciente.data_nascimento)} />
            <Dado rotulo="CPF" valor={formatarCpf(paciente.cpf)} />
            <Dado rotulo="Cartão SUS" valor={paciente.cns} />
            <Dado rotulo="Telefone" valor={paciente.telefone} />
            <Dado rotulo="Cuidador / responsável" valor={paciente.contato_nome} />
            <Dado rotulo="Telefone do cuidador" valor={paciente.contato_telefone} />
            <div className="sm:col-span-2">
              <Dado rotulo="Endereço" valor={[paciente.endereco, paciente.bairro, paciente.municipio].filter(Boolean).join(" — ")} />
            </div>
            <div className="sm:col-span-2"><Dado rotulo="Ponto de referência" valor={paciente.referencia} /></div>
          </dl>
        </Secao>

        <Secao titulo="Dados clínicos e do programa">
          <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Dado rotulo="Diagnóstico principal" valor={paciente.diagnostico} /></div>
            <Dado rotulo="CID-10" valor={paciente.cid} />
            <Dado rotulo="Origem" valor={paciente.origem} />
            <Dado rotulo="Admissão" valor={formatarData(paciente.data_admissao)} />
            <Dado rotulo="Modalidade" valor={paciente.modalidade} />
            <Dado rotulo="Lesão por pressão" valor={paciente.possui_lpp ? "Sim" : "Não"} />
            <div className="sm:col-span-2"><Dado rotulo="Dispositivos / cuidados especiais" valor={paciente.dispositivos} /></div>
            {encerrado && (
              <>
                <Dado rotulo="Data de saída" valor={formatarData(paciente.data_saida)} />
                <Dado rotulo="Motivo" valor={paciente.motivo_saida} />
              </>
            )}
            {paciente.observacoes && (
              <div className="sm:col-span-2">
                <dt className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">Observações</dt>
                <dd className="mx-0 mb-0 mt-1 whitespace-pre-wrap text-heading">{paciente.observacoes}</dd>
              </div>
            )}
          </dl>
        </Secao>
      </div>

      <Secao titulo="Acompanhamento">
        <form action={registrarEvolucao.bind(null, paciente.id)} className="grid gap-3 rounded-2xl bg-detail p-4">
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
          <button className="btn-primario w-full sm:w-auto sm:justify-self-start">Registrar</button>
        </form>

        {evolucoes.length === 0 ? (
          <p className="mb-0 mt-4 text-sm text-muted">Nenhum registro de acompanhamento ainda.</p>
        ) : (
          <ol className="m-0 mt-5 grid list-none gap-4 border-l-2 border-accent-soft-strong p-0 pl-5">
            {evolucoes.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                <p className="m-0 text-sm text-muted">
                  <strong className="text-heading">{formatarData(e.data)}</strong> · {e.tipo} · {e.autor}
                </p>
                <p className="mb-0 mt-1 whitespace-pre-wrap text-heading">{e.texto}</p>
              </li>
            ))}
          </ol>
        )}
      </Secao>
    </div>
  );
}
