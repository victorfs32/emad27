"use client";

import { useState, useTransition } from "react";
import { dadosCadastroDocumento } from "../../actions";
import { FOCOS_INFECCAO, LINHAS_ANTIBIOTICO, ORIGENS, TIPOS_TRATAMENTO, type ItemAntibiotico } from "@/lib/antimicrobiano-pdf";

type Props = { pacientes: { id: number; nome: string; prontuario: string }[]; hoje: string };

const vazio = (): ItemAntibiotico => ({ nome: "", dose: "", via: "", duracao: "" });

/** Ficha de antimicrobiano: o cadastro entra sozinho; o médico marca o foco, a origem e escreve a prescrição. */
export function FormAntimicrobiano({ pacientes, hoje }: Props) {
  const [paciente, setPaciente] = useState("");
  const [focos, setFocos] = useState<string[]>([]);
  const [focoOutra, setFocoOutra] = useState("");
  const [origem, setOrigem] = useState("");
  const [cultura, setCultura] = useState<"sim" | "nao" | "">("");
  const [coleta, setColeta] = useState("");
  const [micro, setMicro] = useState("");
  const [itens, setItens] = useState<ItemAntibiotico[]>(() => Array.from({ length: LINHAS_ANTIBIOTICO }, vazio));
  const [inicio, setInicio] = useState(hoje);
  const [tipo, setTipo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [pendente, iniciar] = useTransition();

  const alternarFoco = (f: string) => setFocos((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]));
  const mudar = (n: number, parte: Partial<ItemAntibiotico>) => setItens((x) => x.map((it, i) => (i === n ? { ...it, ...parte } : it)));

  function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOk("");
    iniciar(async () => {
      try {
        const r = await dadosCadastroDocumento("antimicrobiano", Number(paciente));
        if (r.erro || !r.dados) {
          setErro(r.erro ?? "Não foi possível gerar o documento.");
          return;
        }
        const { gerarAntimicrobianoPdf } = await import("@/lib/antimicrobiano-pdf");
        await gerarAntimicrobianoPdf({
          nome: r.dados.nome, idade: r.dados.idade, nascimento: r.dados.nascimento, sexo: r.dados.sexo, cns: r.dados.cns,
          focos, focoOutra: focoOutra.trim(), origem, guiadaCultura: cultura,
          dataColeta: cultura === "sim" ? coleta : "", microorganismo: cultura === "sim" ? micro.trim() : "",
          antibioticos: itens.filter((i) => i.nome.trim() || i.dose.trim() || i.via.trim() || i.duracao.trim()),
          dataInicio: inicio, tipo, justificativa: justificativa.trim(), data,
        });
        setOk(`Ficha de ${r.dados.nome} gerada.`);
      } catch (err) {
        console.error(err);
        setErro("Não foi possível gerar o PDF. Tente novamente.");
      }
    });
  }

  const botao = (ativo: boolean) =>
    `min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${ativo ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:bg-secondary"}`;

  return (
    <form onSubmit={gerar} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_minmax(0,12rem)]">
        <div>
          <label htmlFor="am-paciente" className="rotulo">Paciente <span className="text-danger">*</span></label>
          <select id="am-paciente" value={paciente} onChange={(e) => setPaciente(e.target.value)} required className="campo">
            <option value="">Escolha o paciente…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="am-data" className="rotulo">Data da ficha</label>
          <input id="am-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required className="campo" />
        </div>
      </div>

      <div>
        <span className="rotulo">1. Foco provável da infecção</span>
        <div className="flex flex-wrap gap-1.5">
          {FOCOS_INFECCAO.map((f) => (
            <button key={f} type="button" aria-pressed={focos.includes(f)} onClick={() => alternarFoco(f)} className={botao(focos.includes(f))}>{f}</button>
          ))}
        </div>
        <input value={focoOutra} maxLength={80} onChange={(e) => setFocoOutra(e.target.value)} placeholder="Outra (descreva)" aria-label="Outro foco" className="campo mt-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="rotulo">2. Origem</span>
          <div role="radiogroup" className="flex flex-wrap gap-1.5">
            {ORIGENS.map((o) => (
              <button key={o} type="button" role="radio" aria-checked={origem === o} onClick={() => setOrigem(origem === o ? "" : o)} className={botao(origem === o)}>{o}</button>
            ))}
          </div>
        </div>
        <div>
          <span className="rotulo">3. Prescrição guiada por cultura?</span>
          <div role="radiogroup" className="flex flex-wrap gap-1.5">
            <button type="button" role="radio" aria-checked={cultura === "sim"} onClick={() => setCultura(cultura === "sim" ? "" : "sim")} className={botao(cultura === "sim")}>Sim</button>
            <button type="button" role="radio" aria-checked={cultura === "nao"} onClick={() => setCultura(cultura === "nao" ? "" : "nao")} className={botao(cultura === "nao")}>Não</button>
          </div>
        </div>
      </div>
      {cultura === "sim" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="am-coleta" className="rotulo">Data da coleta</label>
            <input id="am-coleta" type="date" value={coleta} max={hoje} onChange={(e) => setColeta(e.target.value)} className="campo" />
          </div>
          <div>
            <label htmlFor="am-micro" className="rotulo">Nome do microorganismo</label>
            <input id="am-micro" value={micro} maxLength={120} onChange={(e) => setMicro(e.target.value)} className="campo" />
          </div>
        </div>
      )}

      <div className="grid gap-3">
        <span className="rotulo !mb-0">4. Prescrição</span>
        {itens.map((it, n) => (
          <div key={n} className="grid gap-2 rounded-2xl bg-detail p-3 sm:grid-cols-4">
            <input value={it.nome} maxLength={80} onChange={(e) => mudar(n, { nome: e.target.value })} placeholder={`Antibiótico ${n + 1}`} aria-label={`Nome do antibiótico ${n + 1}`} className="campo" />
            <input value={it.dose} maxLength={60} onChange={(e) => mudar(n, { dose: e.target.value })} placeholder="Dose/Posologia" aria-label={`Dose do antibiótico ${n + 1}`} className="campo" />
            <input value={it.via} maxLength={40} onChange={(e) => mudar(n, { via: e.target.value })} placeholder="Via de administração" aria-label={`Via do antibiótico ${n + 1}`} className="campo" />
            <input value={it.duracao} maxLength={40} onChange={(e) => mudar(n, { duracao: e.target.value })} placeholder="Duração" aria-label={`Duração do antibiótico ${n + 1}`} className="campo" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="am-inicio" className="rotulo">5. Data do início do tratamento</label>
          <input id="am-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="campo" />
        </div>
        <div>
          <span className="rotulo">Tratamento</span>
          <div role="radiogroup" className="flex flex-wrap gap-1.5">
            {TIPOS_TRATAMENTO.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tipo === t} onClick={() => setTipo(tipo === t ? "" : t)} className={botao(tipo === t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="am-just" className="rotulo">6. Justificativa</label>
        <textarea id="am-just" rows={3} maxLength={400} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} className="campo" />
      </div>

      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {ok && <p role="status" className="m-0 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{ok}</p>}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>{pendente ? "Gerando…" : "Gerar ficha em PDF"}</button>
    </form>
  );
}
