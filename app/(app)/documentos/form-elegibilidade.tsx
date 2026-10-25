"use client";

import { useState, useTransition } from "react";
import { fichaParaDocumento } from "../../actions";
import {
  CONDICOES_DIR, CONDICOES_ESQ, DESTINOS, ELEGIVEL, MOTIVOS_INELEGIVEL, NACIONALIDADES, PROCEDENCIAS, RACAS_AEA,
  type DadosElegibilidade,
} from "@/lib/elegibilidade-pdf";
import { cuidadorPrincipal, diagnosticosOrdenados } from "@/lib/documento-util";
import { formatarCep, formatarTelefone } from "@/lib/validacao";
import type { Ficha } from "@/lib/pacientes";

type Props = { pacientes: { id: number; nome: string; prontuario: string }[]; hoje: string; profissional?: { cns: string; cbo: string; cnes: string; ine: string } };

const botao = (ativo: boolean) =>
  `min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${ativo ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:bg-secondary"}`;

const TIPOS_LOGRADOURO = ["Rua", "Avenida", "Travessa", "Alameda", "Praça", "Estrada", "Rodovia", "Beco", "Largo", "Vila", "Passagem"];

function vinculoDoCuidador(v: string | null | undefined) {
  const s = (v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (!s) return "Outro";
  if (/conjuge|espos|marido|companheir|namorad/.test(s)) return "Cônjuge/Companheiro(a)";
  if (/filh|entead/.test(s)) return "Filho(a)/Enteado(a)";
  if (/\bpai\b|\bmae\b/.test(s)) return "Pai/Mãe";
  if (/\bavo\b|\bavos\b|vovo/.test(s)) return "Avó/Avô";
  if (/neto|neta/.test(s)) return "Neto(a)";
  if (/irma/.test(s)) return "Irmão(ã)";
  return "Outro";
}

/** Condições que o cadastro já informa (somadas às que o médico marcar). */
function condicoesDoCadastro(f: Ficha): string[] {
  const tipos = new Set(f.dispositivos.map((x) => x.tipo));
  const c: string[] = ["Domiciliado"];
  if (f.lpp) c.push("Úlceras/feridas (grau III ou IV)");
  if (f.dieta_vias.includes("sng") || tipos.has("sng")) c.push("Uso de sonda nasogástrica - SNG");
  if (f.dieta_vias.includes("sne")) c.push("Uso de sonda nasoenteral - SNE");
  if (f.dieta_vias.includes("gastrostomia") || tipos.has("gtt")) c.push("Uso de gastrostomia");
  if (f.colostomia) c.push("Uso de colostomia");
  if (tipos.has("svd")) c.push("Uso de sonda vesical de demora - SVD");
  if (f.o2) c.push("Oxigenoterapia domiciliar");
  if (f.tqt) c.push("Uso de traqueostomia");
  return c;
}

/** Avaliação de elegibilidade e admissão (e-SUS AB): cadastro entra sozinho; o médico marca procedência, condições e conclusão. */
export function FormElegibilidade({ pacientes, hoje, profissional }: Props) {
  const [paciente, setPaciente] = useState("");
  const [data, setData] = useState(hoje);
  const [cnsProf, setCnsProf] = useState(profissional?.cns ?? "");
  const [cbo, setCbo] = useState(profissional?.cbo ?? "");
  const [cnes, setCnes] = useState(profissional?.cnes ?? "");
  const [ine, setIne] = useState(profissional?.ine ?? "");
  const [turno, setTurno] = useState<"M" | "T" | "N" | "">("");
  const [proc, setProc] = useState("");
  const [cond, setCond] = useState<string[]>([]);
  const [elegivel, setElegivel] = useState("");
  const [destino, setDestino] = useState("");
  const [motivos, setMotivos] = useState<string[]>([]);
  const [raca, setRaca] = useState("");
  const [nacionalidade, setNacionalidade] = useState("Brasileira");
  const [nomeSocial, setNomeSocial] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [pendente, iniciar] = useTransition();

  const alterna = (lista: string[], set: (x: string[]) => void, v: string) => set(lista.includes(v) ? lista.filter((y) => y !== v) : [...lista, v]);
  const soDigitos = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value.replace(/\D/g, ""));

  function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOk("");
    iniciar(async () => {
      try {
        const r = await fichaParaDocumento("elegibilidade_admissao", Number(paciente));
        if (r.erro || !r.dados) {
          setErro(r.erro ?? "Não foi possível gerar o documento.");
          return;
        }
        const f = r.dados.ficha;
        const cids = diagnosticosOrdenados(f);
        const primeira = (f.rua ?? "").trim().split(/\s+/)[0] ?? "";
        const tipoLog = TIPOS_LOGRADOURO.find((x) => x.toLowerCase() === primeira.toLowerCase()) ?? "";
        const logradouro = tipoLog ? (f.rua ?? "").trim().slice(primeira.length).trim() : (f.rua ?? "");
        const cuid = cuidadorPrincipal(f);
        const tels = f.telefones;
        const dados: DadosElegibilidade = {
          cnsProfissional: cnsProf, cbo, cnes, ine, data, turno,
          cnsCidadao: f.cns ?? "", nascimento: f.data_nascimento ?? "", sexo: f.sexo ?? "",
          procedencia: proc,
          condicoes: [...new Set([...cond, ...condicoesDoCadastro(f)])],
          cidPrincipal: cids[0]?.cid ?? "", cidSecundario1: cids[1]?.cid ?? "", cidSecundario2: cids[2]?.cid ?? "",
          elegivel, inelegivel: elegivel === "Inelegível", destino, motivos: elegivel === "Inelegível" ? motivos : [],
          nome: f.nome, nomeSocial: nomeSocial.trim(), raca, etnia: "", nis: "",
          mae: f.nome_mae ?? "", pai: f.nome_pai ?? "", nacionalidade,
          cep: f.cep ? formatarCep(f.cep) : "", municipio: f.municipio ?? "", uf: "CE", bairro: f.bairro ?? "",
          tipoLogradouro: tipoLog, logradouro, numero: f.numero ?? "", complemento: f.complemento ?? "", referencia: f.referencia ?? "",
          email: email.trim(),
          telResidencia: tels[0] ? formatarTelefone(tels[0].numero) : "", telContato: tels[1] ? formatarTelefone(tels[1].numero) : "",
          cuidador: cuid ? vinculoDoCuidador(cuid.vinculo) : "Não possui", cnsCuidador: cuid?.cns ?? "",
        };
        const { gerarElegibilidadePdf } = await import("@/lib/elegibilidade-pdf");
        await gerarElegibilidadePdf(dados);
        setOk(`Avaliação de ${f.nome} gerada.`);
      } catch (err) {
        console.error(err);
        setErro("Não foi possível gerar o PDF. Tente novamente.");
      }
    });
  }

  const caixas = (lista: readonly string[], marcados: string[], set: (x: string[]) => void) =>
    lista.map((c) => (
      <label key={c} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${marcados.includes(c) ? "border-accent bg-accent-soft font-semibold text-heading" : "border-border bg-surface text-muted"}`}>
        <input type="checkbox" checked={marcados.includes(c)} onChange={() => alterna(marcados, set, c)} className="h-4 w-4 accent-[var(--color-accent)]" />
        {c}
      </label>
    ));
  const radios = (lista: readonly string[], atual: string, set: (v: string) => void) =>
    lista.map((o) => (
      <button key={o} type="button" role="radio" aria-checked={atual === o} onClick={() => set(atual === o ? "" : o)} className={botao(atual === o)}>{o}</button>
    ));

  return (
    <form onSubmit={gerar} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_minmax(0,12rem)]">
        <div>
          <label htmlFor="el-paciente" className="rotulo">Paciente <span className="text-danger">*</span></label>
          <select id="el-paciente" value={paciente} onChange={(e) => setPaciente(e.target.value)} required className="campo">
            <option value="">Escolha o paciente…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="el-data" className="rotulo">Data</label>
          <input id="el-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required className="campo" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="el-cnsp" className="rotulo">CNS do profissional</label>
          <input id="el-cnsp" inputMode="numeric" maxLength={15} value={cnsProf} onChange={soDigitos(setCnsProf)} className="campo" />
        </div>
        <div>
          <label htmlFor="el-cbo" className="rotulo">CBO</label>
          <input id="el-cbo" maxLength={6} value={cbo} onChange={soDigitos(setCbo)} className="campo" />
        </div>
        <div>
          <label htmlFor="el-cnes" className="rotulo">CNES</label>
          <input id="el-cnes" maxLength={7} value={cnes} onChange={soDigitos(setCnes)} className="campo" />
        </div>
        <div>
          <label htmlFor="el-ine" className="rotulo">INE</label>
          <input id="el-ine" maxLength={10} value={ine} onChange={soDigitos(setIne)} className="campo" />
        </div>
        <div className="sm:col-span-3">
          <span className="rotulo">Turno</span>
          <div role="radiogroup" className="flex gap-1.5">
            {(["M", "T", "N"] as const).map((x) => (
              <button key={x} type="button" role="radio" aria-checked={turno === x} onClick={() => setTurno(turno === x ? "" : x)} className={botao(turno === x)}>
                {x === "M" ? "Manhã" : x === "T" ? "Tarde" : "Noite"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <span className="rotulo">Procedência</span>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">{radios(PROCEDENCIAS, proc, setProc)}</div>
      </div>

      <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
        <legend className="rotulo p-0">Condição(ões) avaliada(s)</legend>
        <p className="m-0 text-xs text-muted">Domiciliado, sondas, gastrostomia, colostomia, SVD, traqueostomia, oxigênio e lesão por pressão entram marcados pelo cadastro. Marque aqui o que mais se aplica.</p>
        <div className="grid gap-1.5 sm:grid-cols-2">{caixas([...CONDICOES_ESQ, ...CONDICOES_DIR], cond, setCond)}</div>
      </fieldset>

      <div>
        <span className="rotulo">Conclusão / destino</span>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">{radios([...ELEGIVEL, "Inelegível"], elegivel, setElegivel)}</div>
        <div role="radiogroup" className="mt-2 flex flex-wrap gap-1.5">{radios(DESTINOS, destino, setDestino)}</div>
        {elegivel === "Inelegível" && (
          <div className="mt-2 grid gap-1.5">{caixas(MOTIVOS_INELEGIVEL, motivos, setMotivos)}</div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="el-raca" className="rotulo">Raça/cor</label>
          <select id="el-raca" value={raca} onChange={(e) => setRaca(e.target.value)} className="campo">
            <option value="">Preencher à mão</option>
            {RACAS_AEA.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="el-nac" className="rotulo">Nacionalidade</label>
          <select id="el-nac" value={nacionalidade} onChange={(e) => setNacionalidade(e.target.value)} className="campo">
            {NACIONALIDADES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="el-social" className="rotulo">Nome social (opcional)</label>
          <input id="el-social" maxLength={80} value={nomeSocial} onChange={(e) => setNomeSocial(e.target.value)} className="campo" />
        </div>
        <div>
          <label htmlFor="el-email" className="rotulo">E-mail (opcional)</label>
          <input id="el-email" type="email" maxLength={80} value={email} onChange={(e) => setEmail(e.target.value)} className="campo" />
        </div>
      </div>
      <p className="m-0 text-xs text-muted">Nome, mãe, pai, CNS, nascimento, sexo, endereço, telefones, CIDs e cuidador saem do cadastro.</p>

      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {ok && <p role="status" className="m-0 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{ok}</p>}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>{pendente ? "Gerando…" : "Gerar avaliação em PDF"}</button>
    </form>
  );
}
