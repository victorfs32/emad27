"use client";

import { useState, useTransition } from "react";
import { dadosCadastroDocumento } from "../../actions";

type Props = { pacientes: { id: number; nome: string; prontuario: string }[]; hoje: string; carimbo?: string[] };

/** Requerimento de fraldas: o cadastro entra sozinho; o médico informa tipo, marca, tamanho e quantidade. */
export function FormFraldas({ pacientes, hoje, carimbo }: Props) {
  const [paciente, setPaciente] = useState("");
  const [tipo, setTipo] = useState<"geriatrica" | "infantil" | "">("geriatrica");
  const [marca, setMarca] = useState<"sim" | "nao" | "">("nao");
  const [motivo, setMotivo] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [porDia, setPorDia] = useState("");
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [pendente, iniciar] = useTransition();

  function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOk("");
    iniciar(async () => {
      try {
        const r = await dadosCadastroDocumento("fraldas", Number(paciente));
        if (r.erro || !r.dados) {
          setErro(r.erro ?? "Não foi possível gerar o documento.");
          return;
        }
        const { gerarFraldasPdf } = await import("@/lib/fraldas-pdf");
        await gerarFraldasPdf({
          nome: r.dados.nome, cns: r.dados.cns, nascimento: r.dados.nascimento, diagnostico: r.dados.diagnostico,
          tipo, marcaDefinida: marca, marcaMotivo: marca === "sim" ? motivo.trim() : "", tamanho: tamanho.trim(), porDia: porDia.trim(), data, carimbo,
        });
        setOk(`Requerimento de ${r.dados.nome} gerado.`);
      } catch (err) {
        console.error(err);
        setErro("Não foi possível gerar o PDF. Tente novamente.");
      }
    });
  }

  const botao = (ativo: boolean) =>
    `min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${ativo ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:bg-secondary"}`;

  return (
    <form onSubmit={gerar} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_minmax(0,12rem)]">
        <div>
          <label htmlFor="fr-paciente" className="rotulo">Paciente <span className="text-danger">*</span></label>
          <select id="fr-paciente" value={paciente} onChange={(e) => setPaciente(e.target.value)} required className="campo">
            <option value="">Escolha o paciente…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="fr-data" className="rotulo">Data</label>
          <input id="fr-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required className="campo" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="rotulo">Tipo de fralda</span>
          <div role="radiogroup" className="flex flex-wrap gap-1.5">
            <button type="button" role="radio" aria-checked={tipo === "geriatrica"} onClick={() => setTipo("geriatrica")} className={botao(tipo === "geriatrica")}>Geriátrica</button>
            <button type="button" role="radio" aria-checked={tipo === "infantil"} onClick={() => setTipo("infantil")} className={botao(tipo === "infantil")}>Infantil</button>
          </div>
        </div>
        <div>
          <span className="rotulo">Marca definida?</span>
          <div role="radiogroup" className="flex flex-wrap gap-1.5">
            <button type="button" role="radio" aria-checked={marca === "sim"} onClick={() => setMarca("sim")} className={botao(marca === "sim")}>Sim</button>
            <button type="button" role="radio" aria-checked={marca === "nao"} onClick={() => setMarca("nao")} className={botao(marca === "nao")}>Não</button>
          </div>
        </div>
      </div>
      {marca === "sim" && (
        <div>
          <label htmlFor="fr-motivo" className="rotulo">Qual marca e qual motivo dessa marca específica?</label>
          <input id="fr-motivo" value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)} className="campo" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="fr-tam" className="rotulo">Tamanho</label>
          <input id="fr-tam" value={tamanho} maxLength={20} onChange={(e) => setTamanho(e.target.value)} placeholder="Ex.: G" className="campo" />
        </div>
        <div>
          <label htmlFor="fr-dia" className="rotulo">Fraldas por dia</label>
          <input id="fr-dia" type="number" min={1} max={24} inputMode="numeric" value={porDia} onChange={(e) => setPorDia(e.target.value)} placeholder="Ex.: 4" className="campo" />
          <p className="mb-0 mt-1 text-xs text-muted">{Number(porDia) > 0 ? `${Math.round(Number(porDia) * 30)} fraldas por mês (calculado)` : "O total por mês é calculado sozinho (30 dias)."}</p>
        </div>
      </div>
      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {ok && <p role="status" className="m-0 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{ok}</p>}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>{pendente ? "Gerando…" : "Gerar requerimento em PDF"}</button>
    </form>
  );
}
