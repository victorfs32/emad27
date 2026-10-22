"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { pesquisarCid, salvarPaciente } from "../../actions";
import {
  CONTINENCIA, DE_QUEM, DIURESE, FISIO, MODALIDADES, SITUACOES, VIAS_DIETA, calcularIdade,
} from "@/lib/opcoes";
import { formatarCep, formatarCns, formatarCpf, formatarTelefone } from "@/lib/validacao";
import type { DadosForm, Duplicado, TriEstado } from "@/lib/formulario";
import { IconeFechar, IconeMais } from "../icones";

type Props = {
  id: number | null;
  inicial: DadosForm;
  uapss: { id: number; nome: string }[];
  bairros: string[];
};

// ---------------------------------------------------------------- peças pequenas
function Bloco({ id, titulo, apoio, children }: { id: string; titulo: string; apoio?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="cartao scroll-mt-4">
      <h2 className="m-0 text-base font-bold text-heading">{titulo}</h2>
      {apoio && <p className="mb-0 mt-1 text-sm text-muted">{apoio}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Campo({
  rotulo, children, largo, obrigatorio, dica,
}: { rotulo: string; children: React.ReactNode; largo?: boolean; obrigatorio?: boolean; dica?: string }) {
  return (
    <div className={largo ? "sm:col-span-2" : ""}>
      <label className="rotulo">
        {rotulo}
        {obrigatorio && <span className="text-danger"> *</span>}
      </label>
      {children}
      {dica && <p className="mb-0 mt-1 text-xs text-muted">{dica}</p>}
    </div>
  );
}

const botaoOpcao = (ativo: boolean, neutro: boolean) =>
  `min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${
    ativo
      ? neutro ? "border-border bg-secondary text-heading" : "border-accent bg-accent text-white"
      : "border-border bg-surface text-muted hover:bg-secondary"
  }`;

function Tri({ valor, onChange }: { valor: TriEstado; onChange: (v: TriEstado) => void }) {
  const opcoes: [TriEstado, string][] = [["sim", "Sim"], ["nao", "Não"], ["", "Não informado"]];
  return (
    <div role="radiogroup" className="inline-flex flex-wrap gap-1.5">
      {opcoes.map(([v, r]) => (
        <button key={v || "ni"} type="button" role="radio" aria-checked={valor === v} onClick={() => onChange(v)} className={botaoOpcao(valor === v, v === "")}>
          {r}
        </button>
      ))}
    </div>
  );
}

const Condicional = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-4 rounded-2xl border border-accent-soft-strong bg-accent-soft/50 p-4 sm:col-span-2 sm:grid-cols-2">{children}</div>
);

function BotaoAdicionar({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="btn-secundario !min-h-11 !px-4 !text-sm">
      <IconeMais className="h-4 w-4" /> {children}
    </button>
  );
}

function Remover({ onClick, rotulo }: { onClick: () => void; rotulo: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted hover:bg-danger-soft hover:text-danger-strong"
    >
      <IconeFechar className="h-4 w-4" />
    </button>
  );
}

function BuscaCid({ onAdd }: { onAdd: (cid: string, descricao: string) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ codigo: string; descricao: string }[]>([]);
  const ultimo = useRef(0);

  useEffect(() => {
    const n = ++ultimo.current;
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      const r = await pesquisarCid(q);
      if (n === ultimo.current) setRes(r);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const lista = q.trim().length < 2 ? [] : res;
  const parecidoComCodigo = /^[A-Za-z]\d{2}(\.\d{1,2})?$/.test(q.trim());
  const escolher = (cid: string, desc: string) => {
    onAdd(cid, desc);
    setQ("");
    setRes([]);
  };

  return (
    <div className="relative sm:col-span-2">
      <label className="rotulo">Buscar CID pelo código ou pelo nome</label>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: I64 ou acidente vascular" className="campo" autoComplete="off" />
      {(lista.length > 0 || parecidoComCodigo) && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full list-none overflow-auto rounded-2xl border border-border bg-surface p-1 shadow-card-lg">
          {lista.map((r) => (
            <li key={r.codigo}>
              <button type="button" onClick={() => escolher(r.codigo, r.descricao)} className="flex w-full gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-secondary">
                <strong className="w-14 shrink-0 text-heading">{r.codigo}</strong>
                <span>{r.descricao}</span>
              </button>
            </li>
          ))}
          {parecidoComCodigo && !lista.some((r) => r.codigo.toUpperCase() === q.trim().toUpperCase()) && (
            <li>
              <button type="button" onClick={() => escolher(q.trim().toUpperCase(), "")} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-accent hover:bg-secondary">
                Adicionar “{q.trim().toUpperCase()}” e descrever manualmente
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- formulário
type ChaveLista = "telefones" | "cuidadores" | "diagnosticos" | "lesoes";

export function FormularioPaciente({ id, inicial, uapss, bairros }: Props) {
  const [d, setD] = useState<DadosForm>(inicial);
  const [erro, setErro] = useState("");
  const [duplicados, setDuplicados] = useState<Duplicado[]>([]);
  const [pendente, iniciar] = useTransition();
  const topo = useRef<HTMLDivElement>(null);

  const set = <K extends keyof DadosForm>(k: K, v: DadosForm[K]) => setD((p) => ({ ...p, [k]: v }));
  const texto = (k: keyof DadosForm, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input value={d[k] as string} onChange={(e) => set(k, e.target.value as never)} className="campo" {...extra} />
  );
  const lista = <K extends ChaveLista>(k: K, i: number, patch: Partial<DadosForm[K][number]>) =>
    setD((p) => ({ ...p, [k]: (p[k] as object[]).map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const remover = (k: ChaveLista, i: number) => setD((p) => ({ ...p, [k]: (p[k] as object[]).filter((_, j) => j !== i) }));

  function enviar(confirmar: boolean) {
    setErro("");
    iniciar(async () => {
      const r = await salvarPaciente(id, d, confirmar);
      if (r?.erro) setErro(r.erro);
      setDuplicados(r?.duplicados ?? []);
      if (r?.erro || r?.duplicados) topo.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const idade = calcularIdade(d.data_nascimento);
  const toggleVia = (v: string) =>
    set("dieta_vias", d.dieta_vias.includes(v) ? d.dieta_vias.filter((x) => x !== v) : [...d.dieta_vias, v]);

  const secoes = [["identificacao", "Identificação"], ["contatos", "Contatos e endereço"], ["cuidadores", "Cuidadores"], ["clinico", "Clínico"]];

  return (
    <form onSubmit={(e) => { e.preventDefault(); enviar(false); }} className="grid gap-5">
      <div ref={topo} className="scroll-mt-4" />
      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Seções do cadastro">
        {secoes.map(([a, r]) => (
          <a key={a} href={`#${a}`} className="whitespace-nowrap rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-muted hover:text-heading">{r}</a>
        ))}
      </nav>

      {erro && (
        <p role="alert" className="m-0 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>
      )}
      {duplicados.length > 0 && (
        <div role="alert" className="rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-strong">
          <strong>Possível cadastro duplicado.</strong>
          <ul className="mb-3 mt-2 list-disc pl-5">
            {duplicados.map((x, i) => (
              <li key={i}>
                {x.campo} já cadastrado para{" "}
                <Link href={`/pacientes/${x.id}`} target="_blank" className="font-bold underline">{x.nome} (prontuário {x.prontuario})</Link>.
              </li>
            ))}
          </ul>
          <button type="button" disabled={pendente} onClick={() => enviar(true)} className="btn-secundario !min-h-11 !text-sm">
            É outro paciente — salvar mesmo assim
          </button>
        </div>
      )}

      <Bloco id="identificacao" titulo="Identificação" apoio="Campos com * são obrigatórios; o restante pode ser completado depois.">
        <Campo rotulo="Prontuário" obrigatorio dica="Não pode repetir. Zeros à esquerda são mantidos.">
          {texto("prontuario", { maxLength: 30, autoComplete: "off" })}
        </Campo>
        <Campo rotulo="Paciente (nome completo)" obrigatorio>{texto("nome", { autoComplete: "off" })}</Campo>

        <Campo rotulo="UAPS de referência">
          <select value={d.uaps_id} onChange={(e) => set("uaps_id", e.target.value)} className="campo">
            <option value="">Não informada</option>
            {uapss.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            <option value="nova">+ Cadastrar nova unidade…</option>
          </select>
        </Campo>
        {d.uaps_id === "nova" ? (
          <Campo rotulo="Nome da nova UAPS" obrigatorio>{texto("uaps_nova", { placeholder: "Ex.: UAPS Dr. Fulano" })}</Campo>
        ) : <div className="hidden sm:block" />}

        <Campo rotulo="Situação" obrigatorio>
          <select value={d.situacao} onChange={(e) => set("situacao", e.target.value)} className="campo">
            {SITUACOES.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Modalidade">
          <select value={d.modalidade} onChange={(e) => set("modalidade", e.target.value)} className="campo">
            <option value="">Não informada</option>
            {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Campo>

        {d.situacao !== "ativo" && (
          <Condicional>
            <Campo rotulo="Data da alta / mudança de situação">{texto("situacao_data", { type: "date" })}</Campo>
            <Campo rotulo="Motivo">{texto("situacao_motivo")}</Campo>
            <Campo rotulo="Observações" largo>
              <textarea value={d.situacao_obs} onChange={(e) => set("situacao_obs", e.target.value)} rows={2} className="campo" />
            </Campo>
          </Condicional>
        )}

        <Campo rotulo="Data de nascimento">{texto("data_nascimento", { type: "date" })}</Campo>
        <Campo rotulo="Idade" dica="Calculada automaticamente pela data de nascimento.">
          <p className="m-0 flex min-h-12 items-center rounded-2xl bg-secondary px-3.5 text-[15px] font-semibold text-heading">
            {idade === null ? "Não informada" : `${idade} anos`}
          </p>
        </Campo>
        <Campo rotulo="Admissão" obrigatorio dica="Data de entrada no acompanhamento da equipe.">{texto("admissao", { type: "date" })}</Campo>
        <Campo rotulo="CPF">
          <input value={d.cpf} onChange={(e) => set("cpf", formatarCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" className="campo" />
        </Campo>
        <Campo rotulo="CNS (Cartão Nacional de Saúde)">
          <input value={d.cns} onChange={(e) => set("cns", formatarCns(e.target.value))} inputMode="numeric" placeholder="000 0000 0000 0000" className="campo" />
        </Campo>
        <Campo rotulo="RG">{texto("rg", { maxLength: 30, autoComplete: "off" })}</Campo>
        <Campo rotulo="Nome da mãe">{texto("nome_mae")}</Campo>
        <Campo rotulo="Nome do pai">{texto("nome_pai")}</Campo>
      </Bloco>

      <Bloco id="contatos" titulo="Contatos e endereço">
        <div className="grid gap-3 sm:col-span-2">
          <p className="m-0 text-sm font-semibold text-heading">Telefones</p>
          {d.telefones.map((t, i) => (
            <div key={i} className="grid gap-2 rounded-2xl bg-detail p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
              <input value={t.numero} onChange={(e) => lista("telefones", i, { numero: formatarTelefone(e.target.value) })} type="tel" inputMode="tel" placeholder="(00) 00000-0000" aria-label="Número" className="campo" />
              <select value={t.de_quem} onChange={(e) => lista("telefones", i, { de_quem: e.target.value })} aria-label="De quem é" className="campo">
                {DE_QUEM.map((x) => <option key={x.valor} value={x.valor}>{x.rotulo}</option>)}
              </select>
              <select value={t.whatsapp} onChange={(e) => lista("telefones", i, { whatsapp: e.target.value as TriEstado })} aria-label="WhatsApp" className="campo">
                <option value="">WhatsApp: não informado</option>
                <option value="sim">Tem WhatsApp</option>
                <option value="nao">Sem WhatsApp</option>
              </select>
              <Remover onClick={() => remover("telefones", i)} rotulo="Remover telefone" />
            </div>
          ))}
          <div><BotaoAdicionar onClick={() => set("telefones", [...d.telefones, { numero: "", de_quem: "paciente", whatsapp: "" }])}>Adicionar telefone</BotaoAdicionar></div>
        </div>

        <Campo rotulo="CEP">
          <input value={d.cep} onChange={(e) => set("cep", formatarCep(e.target.value))} inputMode="numeric" placeholder="00000-000" className="campo" />
        </Campo>
        <Campo rotulo="Município">{texto("municipio")}</Campo>
        <Campo rotulo="Bairro" dica="Usado para filtrar e organizar as visitas.">
          <input value={d.bairro} onChange={(e) => set("bairro", e.target.value)} list="lista-bairros" className="campo" autoComplete="off" />
          <datalist id="lista-bairros">{bairros.map((b) => <option key={b} value={b} />)}</datalist>
        </Campo>
        <Campo rotulo="Rua">{texto("rua")}</Campo>
        <Campo rotulo="Número">{texto("numero", { maxLength: 15 })}</Campo>
        <Campo rotulo="Complemento">{texto("complemento")}</Campo>
        <Campo rotulo="Ponto de referência" largo>{texto("referencia")}</Campo>
      </Bloco>

      <Bloco id="cuidadores" titulo="Cuidadores" apoio="É possível cadastrar mais de um. Marque o principal.">
        <div className="grid gap-3 sm:col-span-2">
          {d.cuidadores.map((c, i) => (
            <div key={i} className="grid gap-3 rounded-2xl bg-detail p-3 sm:grid-cols-2">
              <Campo rotulo="Nome completo"><input value={c.nome} onChange={(e) => lista("cuidadores", i, { nome: e.target.value })} className="campo" /></Campo>
              <Campo rotulo="Vínculo com o paciente"><input value={c.vinculo} onChange={(e) => lista("cuidadores", i, { vinculo: e.target.value })} placeholder="Filho(a), cônjuge, cuidador contratado…" className="campo" /></Campo>
              <Campo rotulo="Telefone"><input value={c.telefone} onChange={(e) => lista("cuidadores", i, { telefone: formatarTelefone(e.target.value) })} type="tel" inputMode="tel" className="campo" /></Campo>
              <Campo rotulo="CPF"><input value={c.cpf} onChange={(e) => lista("cuidadores", i, { cpf: formatarCpf(e.target.value) })} inputMode="numeric" className="campo" /></Campo>
              <Campo rotulo="CNS"><input value={c.cns} onChange={(e) => lista("cuidadores", i, { cns: formatarCns(e.target.value) })} inputMode="numeric" className="campo" /></Campo>
              <div className="flex items-end justify-between gap-3">
                <label className="flex min-h-12 items-center gap-2.5 text-[15px] font-semibold text-heading">
                  <input
                    type="radio" name="cuidador-principal" checked={c.principal}
                    onChange={() => setD((p) => ({ ...p, cuidadores: p.cuidadores.map((x, j) => ({ ...x, principal: j === i })) }))}
                    className="h-5 w-5 accent-[#1d6f57]"
                  />
                  Cuidador principal
                </label>
                <Remover onClick={() => remover("cuidadores", i)} rotulo="Remover cuidador" />
              </div>
            </div>
          ))}
          <div>
            <BotaoAdicionar onClick={() => set("cuidadores", [...d.cuidadores, { nome: "", principal: d.cuidadores.length === 0, vinculo: "", telefone: "", cns: "", cpf: "" }])}>
              Adicionar cuidador
            </BotaoAdicionar>
          </div>
        </div>
      </Bloco>

      <Bloco id="clinico" titulo="Informações clínicas" apoio="“Não informado” é diferente de “Não”: só marque Não quando a equipe confirmou.">
        <BuscaCid onAdd={(cid, descricao) => !d.diagnosticos.some((x) => x.cid === cid) && set("diagnosticos", [...d.diagnosticos, { cid, descricao, principal: d.diagnosticos.length === 0 }])} />
        <div className="grid gap-2 sm:col-span-2">
          {d.diagnosticos.length === 0 && <p className="m-0 text-sm text-muted">Nenhum diagnóstico (CID) registrado.</p>}
          {d.diagnosticos.map((x, i) => (
            <div key={i} className="grid gap-2 rounded-2xl bg-detail p-3 sm:grid-cols-[7rem_1fr_auto_auto] sm:items-center">
              <input value={x.cid} onChange={(e) => lista("diagnosticos", i, { cid: e.target.value.toUpperCase() })} aria-label="Código CID" className="campo" />
              <input value={x.descricao} onChange={(e) => lista("diagnosticos", i, { descricao: e.target.value })} aria-label="Descrição" placeholder="Descrição" className="campo" />
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-heading">
                <input
                  type="radio" name="dx-principal" checked={x.principal}
                  onChange={() => setD((p) => ({ ...p, diagnosticos: p.diagnosticos.map((y, j) => ({ ...y, principal: j === i })) }))}
                  className="h-5 w-5 accent-[#1d6f57]"
                />
                Principal
              </label>
              <Remover onClick={() => remover("diagnosticos", i)} rotulo="Remover diagnóstico" />
            </div>
          ))}
        </div>

        <Campo rotulo="Fisioterapia" largo>
          <div className="flex flex-wrap gap-1.5">
            {[...FISIO.map((f) => [f.valor, f.rotulo] as const), ["", "Não informado"] as const].map(([v, r]) => (
              <button key={v || "ni"} type="button" role="radio" aria-checked={d.fisio === v} onClick={() => set("fisio", v)} className={botaoOpcao(d.fisio === v, v === "")}>{r}</button>
            ))}
          </div>
        </Campo>
        {d.fisio === "sim" && (
          <Condicional>
            <Campo rotulo="Frequência">{texto("fisio_frequencia", { placeholder: "Ex.: 3x por semana" })}</Campo>
            <Campo rotulo="Observações">{texto("fisio_obs")}</Campo>
          </Condicional>
        )}

        <Campo rotulo="Dieta — via de alimentação (pode marcar mais de uma)" largo>
          <div className="flex flex-wrap gap-2">
            {VIAS_DIETA.map((v) => (
              <label key={v.valor} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold ${d.dieta_vias.includes(v.valor) ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-muted"}`}>
                <input type="checkbox" checked={d.dieta_vias.includes(v.valor)} onChange={() => toggleVia(v.valor)} className="h-4 w-4 accent-[#1d6f57]" />
                {v.rotulo}
              </label>
            ))}
          </div>
        </Campo>
        {d.dieta_vias.length > 0 && (
          <Condicional>
            {d.dieta_vias.includes("outra") && <Campo rotulo="Qual outra via?">{texto("dieta_outra")}</Campo>}
            <Campo rotulo="Observações sobre a dieta" largo>
              <textarea value={d.dieta_obs} onChange={(e) => set("dieta_obs", e.target.value)} rows={2} className="campo" />
            </Campo>
          </Condicional>
        )}

        <Campo rotulo="Diurese — eliminação urinária">
          <select value={d.diurese} onChange={(e) => set("diurese", e.target.value)} className="campo">
            <option value="">Não informada</option>
            {DIURESE.map((x) => <option key={x.valor} value={x.valor}>{x.rotulo}</option>)}
          </select>
        </Campo>
        {d.diurese === "outra" ? <Campo rotulo="Qual outra forma?">{texto("diurese_outra")}</Campo> : <div className="hidden sm:block" />}
        <Campo rotulo="Uso de fralda"><Tri valor={d.usa_fralda} onChange={(v) => set("usa_fralda", v)} /></Campo>
        <Campo rotulo="Continência">
          <select value={d.continencia} onChange={(e) => set("continencia", e.target.value)} className="campo">
            <option value="">Não informada</option>
            {CONTINENCIA.map((x) => <option key={x.valor} value={x.valor}>{x.rotulo}</option>)}
          </select>
        </Campo>

        <Campo rotulo="Traqueostomia (TQT)" largo><Tri valor={d.tqt} onChange={(v) => set("tqt", v)} /></Campo>
        {d.tqt === "sim" && (
          <Condicional>
            <Campo rotulo="Tipo de cânula">{texto("tqt_canula_tipo")}</Campo>
            <Campo rotulo="Calibre">{texto("tqt_calibre", { maxLength: 20 })}</Campo>
            <Campo rotulo="Data da última troca">{texto("tqt_ultima_troca", { type: "date" })}</Campo>
            <Campo rotulo="Observações">{texto("tqt_obs")}</Campo>
          </Condicional>
        )}

        <Campo rotulo="Lesão por pressão (LPP)" largo><Tri valor={d.lpp} onChange={(v) => set("lpp", v)} /></Campo>
        {d.lpp === "sim" && (
          <div className="grid gap-3 rounded-2xl border border-accent-soft-strong bg-accent-soft/50 p-4 sm:col-span-2">
            {d.lesoes.length === 0 && <p className="m-0 text-sm text-muted">Cadastre cada lesão separadamente.</p>}
            {d.lesoes.map((l, i) => (
              <div key={i} className="grid gap-3 rounded-2xl bg-surface p-3 sm:grid-cols-2">
                <Campo rotulo="Localização"><input value={l.localizacao} onChange={(e) => lista("lesoes", i, { localizacao: e.target.value })} placeholder="Sacral, calcâneo direito…" className="campo" /></Campo>
                <Campo rotulo="Classificação"><input value={l.classificacao} onChange={(e) => lista("lesoes", i, { classificacao: e.target.value })} placeholder="Estágio 2, 3…" className="campo" /></Campo>
                <Campo rotulo="Cobertura utilizada"><input value={l.cobertura} onChange={(e) => lista("lesoes", i, { cobertura: e.target.value })} className="campo" /></Campo>
                <div className="flex items-end gap-3">
                  <div className="flex-1"><Campo rotulo="Data da avaliação"><input type="date" value={l.data_avaliacao} onChange={(e) => lista("lesoes", i, { data_avaliacao: e.target.value })} className="campo" /></Campo></div>
                  <Remover onClick={() => remover("lesoes", i)} rotulo="Remover lesão" />
                </div>
              </div>
            ))}
            <div><BotaoAdicionar onClick={() => set("lesoes", [...d.lesoes, { localizacao: "", classificacao: "", cobertura: "", data_avaliacao: "" }])}>Adicionar lesão</BotaoAdicionar></div>
          </div>
        )}

        <Campo rotulo="Oxigênio (O₂)" largo><Tri valor={d.o2} onChange={(v) => set("o2", v)} /></Campo>
        {d.o2 === "sim" && (
          <Condicional>
            <Campo rotulo="Dispositivo utilizado">{texto("o2_dispositivo", { placeholder: "Concentrador, cilindro, cateter nasal…" })}</Campo>
            <Campo rotulo="Fluxo prescrito (L/min)">{texto("o2_fluxo", { inputMode: "decimal", placeholder: "Ex.: 2" })}</Campo>
            <Campo rotulo="Regime de uso">{texto("o2_regime", { placeholder: "Contínuo, noturno, intermitente…" })}</Campo>
            <Campo rotulo="Observações">{texto("o2_obs")}</Campo>
          </Condicional>
        )}

        <Campo rotulo="Colostomia" largo><Tri valor={d.colostomia} onChange={(v) => set("colostomia", v)} /></Campo>

        <Campo rotulo="Usa cama do PMEC?" largo><Tri valor={d.usa_cama_pmec} onChange={(v) => set("usa_cama_pmec", v)} /></Campo>

        <Campo rotulo="Próxima visita">{texto("proxima_visita", { type: "date" })}</Campo>
        <div className="hidden sm:block" />
        <Campo rotulo="Observações gerais" largo>
          <textarea value={d.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} className="campo" />
        </Campo>
      </Bloco>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={id ? `/pacientes/${id}` : "/"} className="btn-secundario">Cancelar</Link>
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar paciente"}</button>
      </div>
    </form>
  );
}
