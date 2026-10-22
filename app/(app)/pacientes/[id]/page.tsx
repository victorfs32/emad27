import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { listarEvolucoes, listarHistorico, listarProcedimentos, listarUapss, obterFicha, type Ficha } from "@/lib/pacientes";
import {
  CONTINENCIA, DE_QUEM, DIURESE, FISIO, SITUACOES, SITUACOES_ARQUIVADAS, TIPOS_EVOLUCAO, VIAS_DIETA,
  TIPOS_DISPOSITIVO, calcularIdade, formatarData, formatarDataHora, hojeISO, rotulo, simNao, situacaoTroca, valorOuNI,
} from "@/lib/opcoes";
import { formatarCep, formatarCns, formatarCpf, formatarTelefone } from "@/lib/validacao";
import { nomeDoCampo, valorLegivel } from "@/lib/rotulos";
import { agendarVisita, novaAdmissao, registrarEvolucao } from "../../../actions";
import { IconeCalendario } from "../../icones";
import { SeloStatus } from "../../selo-status";

const ABAS = [
  ["identificacao", "Identificação"], ["contatos", "Contatos e endereço"], ["cuidador", "Cuidadores"],
  ["acompanhamento", "Acompanhamento"], ["clinico", "Clínico"], ["procedimentos", "Procedimentos"], ["historico", "Histórico"],
] as const;

function Dado({ rotulo: r, valor, largo }: { rotulo: string; valor: string; largo?: boolean }) {
  const ni = valor === "Não informado";
  return (
    <div className={largo ? "sm:col-span-2" : ""}>
      <dt className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">{r}</dt>
      <dd className={`m-0 mt-1 whitespace-pre-wrap break-words ${ni ? "text-muted" : "text-heading"}`}>{valor}</dd>
    </div>
  );
}

const Secao = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="cartao">
    <h2 className="mb-4 mt-0 text-base font-bold text-heading">{titulo}</h2>
    {children}
  </section>
);
const Grade = ({ children }: { children: React.ReactNode }) => (
  <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</dl>
);
const Vazio = ({ children }: { children: React.ReactNode }) => <p className="m-0 text-sm text-muted">{children}</p>;

export default async function Ficha({ params, searchParams }: PageProps<"/pacientes/[id]">) {
  await connection();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [usuario, ficha] = await Promise.all([exigirUsuario(), obterFicha(Number(id))]);
  if (!ficha) notFound();
  const aba = ABAS.some(([a]) => a === sp.aba) ? (sp.aba as string) : "identificacao";
  const editar = usuario.perms.editar;

  const idade = calcularIdade(ficha.data_nascimento);
  const arquivado = (SITUACOES_ARQUIVADAS as readonly string[]).includes(ficha.situacao);

  return (
    <div className="grid gap-5">
      <Link href={arquivado ? "/arquivados" : "/"} className="text-sm font-semibold text-accent hover:underline">← Voltar à lista</Link>

      <div className="bg-brand-gradient flex flex-wrap items-start justify-between gap-4 rounded-[28px] p-6 text-white shadow-card-lg">
        <div>
          <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.14em] text-white/70">Prontuário {ficha.prontuario}</p>
          <h1 className="m-0 mt-1.5 text-[30px] font-extrabold leading-tight tracking-[-0.02em]">{ficha.nome}</h1>
          <p className="mb-0 mt-1.5 text-sm text-white/80">
            {[idade !== null && `${idade} anos`, ficha.modalidade, ficha.uaps?.nome].filter(Boolean).join(" · ") || "—"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SeloStatus status={ficha.situacao} />
            {ficha.lpp && <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">LPP</span>}
            {ficha.tqt && <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">TQT</span>}
            {ficha.o2 && <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">O₂</span>}
          </div>
        </div>
        {editar && (
          <Link href={`/pacientes/${ficha.id}/editar`} className="inline-flex min-h-11 items-center rounded-2xl border border-white/35 px-5 text-sm font-semibold text-white hover:bg-white/10">
            Editar cadastro
          </Link>
        )}
      </div>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0" aria-label="Seções da ficha">
        {ABAS.map(([a, r]) => (
          <Link
            key={a}
            href={`/pacientes/${ficha.id}?aba=${a}`}
            aria-current={a === aba ? "page" : undefined}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${a === aba ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:text-heading"}`}
          >
            {r}
          </Link>
        ))}
      </nav>

      {aba === "identificacao" && <Identificacao f={ficha} idade={idade} />}
      {aba === "contatos" && <Contatos f={ficha} />}
      {aba === "cuidador" && <Cuidadores f={ficha} />}
      {aba === "acompanhamento" && <Acompanhamento f={ficha} editar={editar} arquivado={arquivado} />}
      {aba === "clinico" && <Clinico f={ficha} />}
      {aba === "procedimentos" && <ProcedimentosDoPaciente id={ficha.id} />}
      {aba === "historico" && <Historico id={ficha.id} />}
    </div>
  );
}

function Identificacao({ f, idade }: { f: Ficha; idade: number | null }) {
  return (
    <div className="grid gap-5">
      <Secao titulo="Identificação">
        <Grade>
          <Dado rotulo="Prontuário" valor={f.prontuario} />
          <Dado rotulo="Paciente" valor={f.nome} />
          <Dado rotulo="UAPS de referência" valor={valorOuNI(f.uaps?.nome)} />
          <Dado rotulo="Modalidade" valor={valorOuNI(f.modalidade)} />
          <Dado rotulo="Data de nascimento" valor={f.data_nascimento ? formatarData(f.data_nascimento) : "Não informado"} />
          <Dado rotulo="Idade" valor={idade === null ? "Não informado" : `${idade} anos`} />
          <Dado rotulo="Admissão" valor={formatarData(f.admissao)} />
          <Dado rotulo="CPF" valor={f.cpf ? formatarCpf(f.cpf) : "Não informado"} />
          <Dado rotulo="CNS" valor={f.cns ? formatarCns(f.cns) : "Não informado"} />
          <Dado rotulo="RG" valor={valorOuNI(f.rg)} />
          <Dado rotulo="Nome da mãe" valor={valorOuNI(f.nome_mae)} />
          <Dado rotulo="Nome do pai" valor={valorOuNI(f.nome_pai)} />
        </Grade>
      </Secao>
      <Secao titulo="Situação atual">
        <Grade>
          <Dado rotulo="Situação" valor={rotulo(SITUACOES, f.situacao) ?? f.situacao} />
          <Dado rotulo="Data" valor={f.situacao_data ? formatarData(f.situacao_data) : "Não informado"} />
          <Dado rotulo="Motivo" valor={valorOuNI(f.situacao_motivo)} />
          <Dado rotulo="Observações" valor={valorOuNI(f.situacao_obs)} />
        </Grade>
      </Secao>
    </div>
  );
}

function Contatos({ f }: { f: Ficha }) {
  return (
    <div className="grid gap-5">
      <Secao titulo="Telefones">
        {f.telefones.length === 0 ? <Vazio>Nenhum telefone informado.</Vazio> : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {f.telefones.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-detail px-4 py-3">
                <a href={`tel:${t.numero}`} className="font-bold text-heading">{formatarTelefone(t.numero)}</a>
                <span className="text-sm text-muted">{rotulo(DE_QUEM, t.de_quem)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.whatsapp ? "bg-success-soft text-success-strong" : "bg-secondary text-muted"}`}>
                  WhatsApp: {simNao(t.whatsapp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Secao>
      <Secao titulo="Endereço">
        <Grade>
          <Dado rotulo="CEP" valor={f.cep ? formatarCep(f.cep) : "Não informado"} />
          <Dado rotulo="Município" valor={valorOuNI(f.municipio)} />
          <Dado rotulo="Bairro" valor={valorOuNI(f.bairro)} />
          <Dado rotulo="Rua" valor={valorOuNI(f.rua)} />
          <Dado rotulo="Número" valor={valorOuNI(f.numero)} />
          <Dado rotulo="Complemento" valor={valorOuNI(f.complemento)} />
          <Dado rotulo="Ponto de referência" valor={valorOuNI(f.referencia)} largo />
        </Grade>
      </Secao>
    </div>
  );
}

function Cuidadores({ f }: { f: Ficha }) {
  return (
    <Secao titulo="Cuidadores">
      {f.cuidadores.length === 0 ? <Vazio>Nenhum cuidador informado.</Vazio> : (
        <div className="grid gap-3">
          {f.cuidadores.map((c) => (
            <div key={c.id} className="rounded-2xl bg-detail p-4">
              <p className="m-0 mb-3 flex flex-wrap items-center gap-2 font-bold text-heading">
                {c.nome}
                {c.principal && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">Principal</span>}
              </p>
              <Grade>
                <Dado rotulo="Vínculo" valor={valorOuNI(c.vinculo)} />
                <Dado rotulo="Telefone" valor={c.telefone ? formatarTelefone(c.telefone) : "Não informado"} />
                <Dado rotulo="CPF" valor={c.cpf ? formatarCpf(c.cpf) : "Não informado"} />
                <Dado rotulo="CNS" valor={c.cns ? formatarCns(c.cns) : "Não informado"} />
              </Grade>
            </div>
          ))}
        </div>
      )}
    </Secao>
  );
}

async function Acompanhamento({ f, editar, arquivado }: { f: Ficha; editar: boolean; arquivado: boolean }) {
  await connection();
  const evolucoes = await listarEvolucoes(f.id);
  const hoje = hojeISO();
  const atrasada = f.proxima_visita && f.proxima_visita < hoje;

  return (
    <div className="grid gap-5">
      {!arquivado && (
        <section className="cartao flex flex-wrap items-center gap-4">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-accent-soft text-accent"><IconeCalendario /></span>
          <div className="min-w-0 flex-1">
            <strong className="block text-heading">Próxima visita: {f.proxima_visita ? formatarData(f.proxima_visita) : "não agendada"}</strong>
            {atrasada && <small className="font-semibold text-danger-strong">Visita atrasada</small>}
          </div>
          {editar && (
            <form action={agendarVisita.bind(null, f.id)} className="flex flex-wrap items-center gap-2">
              <input type="date" name="proxima_visita" defaultValue={f.proxima_visita ?? ""} aria-label="Data da próxima visita" className="campo !w-auto" />
              <button className="btn-secundario !min-h-12">Salvar</button>
            </form>
          )}
        </section>
      )}

      {arquivado && editar && (
        <Secao titulo="Nova admissão">
          <p className="mt-0 text-sm text-muted">
            Reabre o acompanhamento como ativo. A admissão e a saída anteriores ficam guardadas, com todo o histórico.
          </p>
          <form action={novaAdmissao.bind(null, f.id)} className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="adm" className="rotulo">Data da nova admissão</label>
              <input id="adm" type="date" name="data" defaultValue={hoje} required className="campo" />
            </div>
            <button className="btn-primario">Registrar nova admissão</button>
          </form>
        </Secao>
      )}

      {f.admissoes.length > 0 && (
        <Secao titulo="Admissões anteriores">
          <ul className="m-0 grid list-none gap-2 p-0">
            {f.admissoes.map((a) => (
              <li key={a.id} className="rounded-2xl bg-detail px-4 py-3 text-sm">
                <strong className="text-heading">{formatarData(a.admissao)} → {a.saida ? formatarData(a.saida) : "sem data de saída"}</strong>
                <span className="text-muted"> · {rotulo(SITUACOES, a.situacao_saida) ?? "—"}{a.motivo ? ` · ${a.motivo}` : ""}</span>
                {a.obs && <p className="mb-0 mt-1 text-muted">{a.obs}</p>}
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao titulo="Evolução">
        {editar && (
          <form action={registrarEvolucao.bind(null, f.id)} className="grid gap-3 rounded-2xl bg-detail p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="data" className="rotulo">Data</label>
                <input id="data" name="data" type="date" defaultValue={hoje} max={hoje} required className="campo" />
              </div>
              <div>
                <label htmlFor="tipo" className="rotulo">Tipo</label>
                <select id="tipo" name="tipo" className="campo">{TIPOS_EVOLUCAO.map((t) => <option key={t}>{t}</option>)}</select>
              </div>
            </div>
            <div>
              <label htmlFor="texto" className="rotulo">Registro</label>
              <textarea id="texto" name="texto" rows={3} required className="campo" placeholder="Descreva o atendimento, evolução ou intercorrência" />
            </div>
            <button className="btn-primario w-full sm:w-auto sm:justify-self-start">Registrar</button>
          </form>
        )}
        {evolucoes.length === 0 ? (
          <p className="mb-0 mt-4 text-sm text-muted">Nenhum registro de acompanhamento ainda.</p>
        ) : (
          <ol className="m-0 mt-5 grid list-none gap-4 border-l-2 border-accent-soft-strong p-0 pl-5">
            {evolucoes.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                <p className="m-0 text-sm text-muted"><strong className="text-heading">{formatarData(e.data)}</strong> · {e.tipo} · {e.autor}</p>
                <p className="mb-0 mt-1 whitespace-pre-wrap text-heading">{e.texto}</p>
              </li>
            ))}
          </ol>
        )}
      </Secao>
    </div>
  );
}

function Clinico({ f }: { f: Ficha }) {
  const vias = f.dieta_vias.length ? f.dieta_vias.map((v) => rotulo(VIAS_DIETA, v) ?? v).join(", ") : "Não informado";
  return (
    <div className="grid gap-5">
      <Secao titulo="Diagnósticos (CID)">
        {f.diagnosticos.length === 0 ? <Vazio>Nenhum diagnóstico informado.</Vazio> : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {f.diagnosticos.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-detail px-4 py-3">
                <strong className="text-heading">{x.cid}</strong>
                <span className="flex-1 text-sm">{x.descricao || "Sem descrição"}</span>
                {x.principal && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">Principal</span>}
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao titulo="Cuidados e dispositivos">
        <Grade>
          <Dado rotulo="Fisioterapia" valor={f.fisio ? (rotulo(FISIO, f.fisio) ?? f.fisio) : "Não informado"} />
          {f.fisio === "sim" && <Dado rotulo="Frequência" valor={valorOuNI(f.fisio_frequencia)} />}
          {f.fisio_obs && <Dado rotulo="Obs. da fisioterapia" valor={f.fisio_obs} largo />}

          <Dado rotulo="Dieta — via de alimentação" valor={vias} />
          {f.dieta_vias.includes("outra") && <Dado rotulo="Outra via" valor={valorOuNI(f.dieta_outra)} />}
          {f.dieta_obs && <Dado rotulo="Obs. da dieta" valor={f.dieta_obs} largo />}

          <Dado rotulo="Diurese" valor={f.diurese ? (rotulo(DIURESE, f.diurese) ?? f.diurese) : "Não informado"} />
          {f.diurese === "outra" && <Dado rotulo="Outra forma" valor={valorOuNI(f.diurese_outra)} />}
          <Dado rotulo="Uso de fralda" valor={simNao(f.usa_fralda)} />
          <Dado rotulo="Continência" valor={f.continencia ? (rotulo(CONTINENCIA, f.continencia) ?? f.continencia) : "Não informado"} />
          <Dado rotulo="Usa cama do PMEC" valor={simNao(f.usa_cama_pmec)} />
        </Grade>
      </Secao>

      <Secao titulo="Dispositivos e trocas">
        {f.dispositivos.length === 0 ? (
          <Vazio>
            Nenhum dispositivo (GTT, SNG ou SVD) registrado.{" "}
            <Link href="/dispositivos" className="font-semibold text-accent hover:underline">Registrar em Dispositivos</Link>
          </Vazio>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {f.dispositivos.map((d) => {
              const s = situacaoTroca(d.proxima_troca, hojeISO());
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-detail px-4 py-3 text-sm">
                  <strong className="text-heading">{TIPOS_DISPOSITIVO.find((t) => t.valor === d.tipo)?.sigla ?? d.tipo}</strong>
                  <span className="text-muted">
                    nº {d.numero || "não informado"} · confecção {d.confeccao || "não informada"} · troca {d.troca ? formatarData(d.troca) : "não informada"}
                  </span>
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${s === "vencida" ? "bg-danger-soft text-danger-strong" : s === "proxima" ? "bg-warning-soft text-warning-strong" : "bg-[#fff7cc] text-[#6b5b00]"}`}>
                    próxima: {d.proxima_troca ? formatarData(d.proxima_troca) : "sem data"}{s === "vencida" ? " · vencida" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Secao>

      <Secao titulo="Traqueostomia (TQT)">
        <Grade>
          <Dado rotulo="Possui TQT" valor={simNao(f.tqt)} />
          {f.tqt && (
            <>
              <Dado rotulo="Tipo de cânula" valor={valorOuNI(f.tqt_canula_tipo)} />
              <Dado rotulo="Calibre" valor={valorOuNI(f.tqt_calibre)} />
              <Dado rotulo="Última troca" valor={f.tqt_ultima_troca ? formatarData(f.tqt_ultima_troca) : "Não informado"} />
              <Dado rotulo="Observações" valor={valorOuNI(f.tqt_obs)} largo />
            </>
          )}
        </Grade>
      </Secao>

      <Secao titulo="Lesão por pressão (LPP)">
        <Grade><Dado rotulo="Possui LPP" valor={simNao(f.lpp)} /></Grade>
        {f.lpp && (
          f.lesoes_pressao.length === 0 ? <p className="mb-0 mt-4 text-sm text-muted">Nenhuma lesão detalhada.</p> : (
            <div className="mt-4 grid gap-2">
              {f.lesoes_pressao.map((l) => (
                <div key={l.id} className="rounded-2xl bg-detail px-4 py-3 text-sm">
                  <strong className="text-heading">{l.localizacao}</strong>
                  <span className="text-muted"> · {valorOuNI(l.classificacao)} · cobertura: {valorOuNI(l.cobertura)} · avaliada em {l.data_avaliacao ? formatarData(l.data_avaliacao) : "data não informada"}</span>
                </div>
              ))}
            </div>
          )
        )}
      </Secao>

      <Secao titulo="Oxigênio (O₂)">
        <Grade>
          <Dado rotulo="Usa oxigênio" valor={simNao(f.o2)} />
          {f.o2 && (
            <>
              <Dado rotulo="Dispositivo" valor={valorOuNI(f.o2_dispositivo)} />
              <Dado rotulo="Fluxo prescrito" valor={f.o2_fluxo === null ? "Não informado" : `${f.o2_fluxo} L/min`} />
              <Dado rotulo="Regime de uso" valor={valorOuNI(f.o2_regime)} />
              <Dado rotulo="Observações" valor={valorOuNI(f.o2_obs)} largo />
            </>
          )}
        </Grade>
      </Secao>

      <Secao titulo="Colostomia">
        <Grade><Dado rotulo="Possui colostomia" valor={simNao(f.colostomia)} /></Grade>
      </Secao>

      {f.observacoes && <Secao titulo="Observações gerais"><p className="m-0 whitespace-pre-wrap text-heading">{f.observacoes}</p></Secao>}
    </div>
  );
}

const TIPOS_HISTORICO: Record<string, string> = {
  cadastro: "Cadastro", alteracao: "Alteração", situacao: "Situação", lista: "Lista", admissao: "Admissão", dispositivo: "Dispositivo", procedimento: "Procedimento", evolucao: "Acompanhamento",
};

async function Historico({ id }: { id: number }) {
  const [registros, uapss] = await Promise.all([listarHistorico(id), listarUapss()]);
  const mapaUaps = new Map(uapss.map((u) => [u.id, u.nome]));

  return (
    <Secao titulo="Histórico de alterações">
      {registros.length === 0 ? <Vazio>Nenhum registro.</Vazio> : (
        <ol className="m-0 grid list-none gap-4 border-l-2 border-accent-soft-strong p-0 pl-5">
          {registros.map((h) => {
            const det = h.detalhes ?? {};
            const campos = h.tipo === "alteracao" || h.tipo === "situacao" ? Object.entries(det) as [string, { de: unknown; para: unknown }][] : [];
            return (
              <li key={h.id} className="relative">
                <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                <p className="m-0 text-sm text-muted">
                  <strong className="text-heading">{formatarDataHora(h.em)}</strong> · {h.autor} · {TIPOS_HISTORICO[h.tipo] ?? h.tipo}
                </p>
                <p className="mb-0 mt-1 font-semibold text-heading">{h.resumo}</p>
                {campos.length > 0 && (
                  <ul className="mb-0 mt-1.5 grid list-none gap-1 p-0 text-sm">
                    {campos.map(([campo, v]) => (
                      <li key={campo} className="text-muted">
                        <span className="font-semibold text-heading">{nomeDoCampo(campo)}:</span>{" "}
                        {valorLegivel(campo, v.de, mapaUaps)} <span aria-hidden>→</span> {valorLegivel(campo, v.para, mapaUaps)}
                      </li>
                    ))}
                  </ul>
                )}
                {h.tipo === "lista" && (
                  <p className="mb-0 mt-1 text-sm text-muted">
                    {(det.de as unknown[] | undefined)?.length ?? 0} → {(det.para as unknown[] | undefined)?.length ?? 0} itens
                  </p>
                )}
                {h.tipo === "dispositivo" && (() => {
                  const alvo = (det.para ?? det) as Record<string, unknown>;
                  const partes = [
                    alvo.numero ? `nº ${alvo.numero}` : "",
                    alvo.troca ? `troca ${formatarData(String(alvo.troca))}` : "",
                    alvo.proxima_troca ? `próxima ${formatarData(String(alvo.proxima_troca))}` : "",
                  ].filter(Boolean);
                  return partes.length ? <p className="mb-0 mt-1 text-sm text-muted">{partes.join(" · ")}</p> : null;
                })()}
                {h.tipo === "admissao" && (
                  <p className="mb-0 mt-1 text-sm text-muted">
                    Anterior: {formatarData(String(det.admissao_anterior ?? ""))} · Nova: {formatarData(String(det.nova_admissao ?? ""))}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Secao>
  );
}

async function ProcedimentosDoPaciente({ id }: { id: number }) {
  const itens = await listarProcedimentos({ pacienteId: id });
  return (
    <Secao titulo="Procedimentos realizados">
      {itens.length === 0 ? (
        <Vazio>
          Nenhum procedimento registrado. <Link href="/procedimentos" className="font-semibold text-accent hover:underline">Registrar em Procedimentos</Link>
        </Vazio>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0">
          {itens.map((p) => (
            <li key={p.id} className="rounded-2xl bg-detail px-4 py-3 text-sm">
              <strong className="text-heading">{formatarData(p.data)}</strong> · <span className="font-semibold text-heading">{p.tipo}</span>
              <span className="text-muted"> · {p.autor}</span>
              {p.obs && <p className="mb-0 mt-1 text-muted">{p.obs}</p>}
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}
