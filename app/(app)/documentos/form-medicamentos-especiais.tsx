"use client";

import { useState, useTransition } from "react";
import { fichaParaDocumento } from "../../actions";
import { LINHAS_MEDICAMENTOS, MESES_QUANTIDADE, PREENCHIDO_POR, RACAS, type MedicamentoSolicitado } from "@/lib/medicamentos-especiais-pdf";
import { cuidadorPrincipal, diagnosticosOrdenados, telefoneDe } from "@/lib/documento-util";
import { formatarCns, formatarCpf } from "@/lib/validacao";

type Props = { pacientes: { id: number; nome: string; prontuario: string }[]; hoje: string; carimbo?: string[]; profissional?: { cns: string; cnes: string } };

const vazio = (): MedicamentoSolicitado => ({ nome: "", quantidades: Array.from({ length: MESES_QUANTIDADE }, () => "") });
const botao = (ativo: boolean) =>
  `min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${ativo ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:bg-secondary"}`;

/** Laudo de medicamentos especiais: o cadastro entra sozinho; o médico escreve os medicamentos, a anamnese e os atestados. */
export function FormMedicamentosEspeciais({ pacientes, hoje, carimbo, profissional }: Props) {
  const [paciente, setPaciente] = useState("");
  const [cnes, setCnes] = useState(profissional?.cnes ?? "");
  const [estab, setEstab] = useState("PROGRAMA MELHOR EM CASA - EMAD 27");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [meds, setMeds] = useState<MedicamentoSolicitado[]>(() => Array.from({ length: LINHAS_MEDICAMENTOS }, vazio));
  const [anamnese, setAnamnese] = useState("");
  const [previo, setPrevio] = useState<"sim" | "nao" | "">("");
  const [relato, setRelato] = useState("");
  const [incapaz, setIncapaz] = useState<"sim" | "nao" | "">("");
  const [cnsMedico, setCnsMedico] = useState(profissional?.cns ?? "");
  const [data, setData] = useState(hoje);
  const [por, setPor] = useState<string>("Médico solicitante");
  const [outroNome, setOutroNome] = useState("");
  const [outroCpf, setOutroCpf] = useState("");
  const [raca, setRaca] = useState("");
  const [etnia, setEtnia] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [pendente, iniciar] = useTransition();

  const mudarNome = (n: number, nome: string) => setMeds((x) => x.map((m, i) => (i === n ? { ...m, nome } : m)));
  const mudarQtd = (n: number, k: number, v: string) =>
    setMeds((x) => x.map((m, i) => (i === n ? { ...m, quantidades: m.quantidades.map((q, j) => (j === k ? v : q)) } : m)));

  function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOk("");
    const preenchidos = meds.filter((m) => m.nome.trim());
    if (preenchidos.length === 0) {
      setErro("Escreva ao menos um medicamento.");
      return;
    }
    iniciar(async () => {
      try {
        const r = await fichaParaDocumento("medicamentos_especiais", Number(paciente));
        if (r.erro || !r.dados) {
          setErro(r.erro ?? "Não foi possível gerar o documento.");
          return;
        }
        const { ficha: f, medico } = r.dados;
        const principal = diagnosticosOrdenados(f)[0];
        const diagnosticos = diagnosticosOrdenados(f).map((x) => x.descricao || x.cid).join("; ");
        const { gerarMedicamentosEspeciaisPdf } = await import("@/lib/medicamentos-especiais-pdf");
        await gerarMedicamentosEspeciaisPdf({
          nome: f.nome, mae: f.nome_mae ?? "", cid: principal?.cid ?? "", diagnostico: diagnosticos,
          telefone: telefoneDe(f, 2), cpf: f.cpf ? formatarCpf(f.cpf) : "", cns: f.cns ? formatarCns(f.cns) : "",
          cnes, estabelecimento: estab.trim(), peso: peso.trim(), altura: altura.trim(),
          medicamentos: preenchidos.map((m) => ({ nome: m.nome.trim(), quantidades: m.quantidades.map((q) => q.trim()) })),
          anamnese: anamnese.trim(), tratamentoPrevio: previo, relato: relato.trim(),
          incapaz, responsavel: incapaz === "sim" ? (cuidadorPrincipal(f)?.nome ?? "") : "",
          medico, cnsMedico, data, preenchidoPor: por, outroNome: outroNome.trim(), outroCpf,
          raca, etnia: etnia.trim(), documento: f.cpf ? "cpf" : f.cns ? "cns" : "", email: email.trim(), carimbo,
        });
        setOk(`Laudo de ${f.nome} gerado.`);
      } catch (err) {
        console.error(err);
        setErro("Não foi possível gerar o PDF. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={gerar} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_minmax(0,12rem)]">
        <div>
          <label htmlFor="me-paciente" className="rotulo">Paciente <span className="text-danger">*</span></label>
          <select id="me-paciente" value={paciente} onChange={(e) => setPaciente(e.target.value)} required className="campo">
            <option value="">Escolha o paciente…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome} — pront. {p.prontuario}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="me-data" className="rotulo">Data da solicitação</label>
          <input id="me-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required className="campo" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label htmlFor="me-cnes" className="rotulo">CNES (7 dígitos)</label>
          <input id="me-cnes" inputMode="numeric" maxLength={7} value={cnes} onChange={(e) => setCnes(e.target.value.replace(/\D/g, ""))} className="campo" />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="me-estab" className="rotulo">Estabelecimento solicitante</label>
          <input id="me-estab" maxLength={80} value={estab} onChange={(e) => setEstab(e.target.value)} className="campo" />
        </div>
        <div>
          <label htmlFor="me-peso" className="rotulo">Peso (kg)</label>
          <input id="me-peso" inputMode="numeric" maxLength={3} value={peso} onChange={(e) => setPeso(e.target.value.replace(/\D/g, ""))} className="campo" />
        </div>
        <div>
          <label htmlFor="me-altura" className="rotulo">Altura (cm)</label>
          <input id="me-altura" inputMode="numeric" maxLength={3} value={altura} onChange={(e) => setAltura(e.target.value.replace(/\D/g, ""))} className="campo" />
        </div>
      </div>

      <div className="grid gap-3">
        <span className="rotulo !mb-0">Medicamentos e quantidade por mês</span>
        {meds.map((m, n) => (
          <div key={n} className="grid gap-2 rounded-2xl bg-detail p-3">
            <input value={m.nome} maxLength={120} onChange={(e) => mudarNome(n, e.target.value)} placeholder={`Medicamento ${n + 1}`} aria-label={`Medicamento ${n + 1}`} className="campo" />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {m.quantidades.map((q, k) => (
                <input key={k} value={q} maxLength={8} onChange={(e) => mudarQtd(n, k, e.target.value)} placeholder={`${k + 1}º mês`} aria-label={`Medicamento ${n + 1}, quantidade do ${k + 1}º mês`} className="campo" />
              ))}
            </div>
          </div>
        ))}
        <p className="m-0 text-xs text-muted">CID-10 e diagnóstico saem dos diagnósticos do cadastro (o principal vai no campo CID).</p>
      </div>

      <div>
        <label htmlFor="me-anam" className="rotulo">11- Anamnese</label>
        <textarea id="me-anam" rows={4} maxLength={500} value={anamnese} onChange={(e) => setAnamnese(e.target.value)} className="campo" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="rotulo">12- Tratamento prévio ou em tratamento?</span>
          <div role="radiogroup" className="flex gap-1.5">
            <button type="button" role="radio" aria-checked={previo === "nao"} onClick={() => setPrevio(previo === "nao" ? "" : "nao")} className={botao(previo === "nao")}>Não</button>
            <button type="button" role="radio" aria-checked={previo === "sim"} onClick={() => setPrevio(previo === "sim" ? "" : "sim")} className={botao(previo === "sim")}>Sim</button>
          </div>
          {previo === "sim" && <input value={relato} maxLength={150} onChange={(e) => setRelato(e.target.value)} placeholder="Relatar" aria-label="Relato do tratamento" className="campo mt-2" />}
        </div>
        <div>
          <span className="rotulo">13- Paciente considerado incapaz?</span>
          <div role="radiogroup" className="flex gap-1.5">
            <button type="button" role="radio" aria-checked={incapaz === "nao"} onClick={() => setIncapaz(incapaz === "nao" ? "" : "nao")} className={botao(incapaz === "nao")}>Não</button>
            <button type="button" role="radio" aria-checked={incapaz === "sim"} onClick={() => setIncapaz(incapaz === "sim" ? "" : "sim")} className={botao(incapaz === "sim")}>Sim</button>
          </div>
          {incapaz === "sim" && <p className="mb-0 mt-1 text-xs text-muted">O responsável sai do cuidador principal do cadastro.</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="me-cnsm" className="rotulo">15- CNS do médico solicitante</label>
          <input id="me-cnsm" inputMode="numeric" maxLength={15} value={cnsMedico} onChange={(e) => setCnsMedico(e.target.value.replace(/\D/g, ""))} className="campo" />
          <p className="mb-0 mt-1 text-xs text-muted">O nome do médico sai do seu login.</p>
        </div>
        <div>
          <label htmlFor="me-por" className="rotulo">18- Campos abaixo preenchidos por</label>
          <select id="me-por" value={por} onChange={(e) => setPor(e.target.value)} className="campo">
            {PREENCHIDO_POR.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      {por === "Outro" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <input value={outroNome} maxLength={80} onChange={(e) => setOutroNome(e.target.value)} placeholder="Nome de quem preencheu" aria-label="Nome de quem preencheu" className="campo" />
          <input value={outroCpf} inputMode="numeric" maxLength={11} onChange={(e) => setOutroCpf(e.target.value.replace(/\D/g, ""))} placeholder="CPF" aria-label="CPF de quem preencheu" className="campo" />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="me-raca" className="rotulo">19- Raça/Cor/Etnia</label>
          <select id="me-raca" value={raca} onChange={(e) => setRaca(e.target.value)} className="campo">
            <option value="">Preencher à mão</option>
            {RACAS.map((o) => <option key={o}>{o}</option>)}
          </select>
          {raca === "Indígena" && <input value={etnia} maxLength={40} onChange={(e) => setEtnia(e.target.value)} placeholder="Etnia" aria-label="Etnia" className="campo mt-2" />}
        </div>
        <div>
          <label htmlFor="me-email" className="rotulo">22- Correio eletrônico do paciente</label>
          <input id="me-email" type="email" maxLength={80} value={email} onChange={(e) => setEmail(e.target.value)} className="campo" />
        </div>
      </div>

      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}
      {ok && <p role="status" className="m-0 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{ok}</p>}
      <button className="btn-primario w-full sm:w-auto sm:justify-self-start" disabled={pendente}>{pendente ? "Gerando…" : "Gerar laudo em PDF"}</button>
    </form>
  );
}
