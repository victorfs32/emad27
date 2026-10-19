"use client";

import Link from "next/link";
import { useActionState } from "react";
import { salvarPaciente, type EstadoPaciente } from "../../actions";
import { MODALIDADES, SEXOS, STATUS } from "@/lib/opcoes";
import type { DadosPaciente } from "@/lib/pacientes";

type Props = { id: number | null; inicial: Partial<DadosPaciente> };

export function FormularioPaciente({ id, inicial }: Props) {
  const [estado, acao, pendente] = useActionState<EstadoPaciente, FormData>(
    salvarPaciente.bind(null, id),
    {},
  );
  // Em caso de erro, mantém o que a pessoa digitou.
  const v = (c: keyof DadosPaciente) => estado.valores?.[c] ?? inicial[c] ?? "";

  const texto = (c: keyof DadosPaciente, rotulo: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={c} className="rotulo">{rotulo}</label>
      <input id={c} name={c} defaultValue={v(c)} className="campo" {...extra} />
    </div>
  );

  return (
    <form action={acao} className="space-y-5" key={estado.valores ? "erro" : "ok"}>
      <fieldset className="cartao grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Identificação</legend>
        <h2 className="text-base font-bold text-heading sm:col-span-2">Identificação</h2>
        <div className="sm:col-span-2">{texto("nome", "Nome completo *", { required: true, autoComplete: "off" })}</div>
        {texto("data_nascimento", "Data de nascimento", { type: "date" })}
        <div>
          <label htmlFor="sexo" className="rotulo">Sexo</label>
          <select id="sexo" name="sexo" defaultValue={v("sexo")} className="campo">
            <option value="">—</option>
            {SEXOS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
          </select>
        </div>
        {texto("cpf", "CPF", { inputMode: "numeric", maxLength: 14, placeholder: "somente números" })}
        {texto("cns", "Cartão SUS (CNS)", { inputMode: "numeric", maxLength: 18 })}
      </fieldset>

      <fieldset className="cartao grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Contato e endereço</legend>
        <h2 className="text-base font-bold text-heading sm:col-span-2">Contato e endereço</h2>
        {texto("telefone", "Telefone do paciente", { type: "tel", inputMode: "tel" })}
        <div className="hidden sm:block" />
        {texto("contato_nome", "Cuidador / responsável")}
        {texto("contato_telefone", "Telefone do cuidador", { type: "tel", inputMode: "tel" })}
        <div className="sm:col-span-2">{texto("endereco", "Endereço (rua, número, complemento)")}</div>
        {texto("bairro", "Bairro")}
        {texto("municipio", "Município")}
        <div className="sm:col-span-2">{texto("referencia", "Ponto de referência")}</div>
      </fieldset>

      <fieldset className="cartao grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Dados clínicos e do programa</legend>
        <h2 className="text-base font-bold text-heading sm:col-span-2">Dados clínicos e do programa</h2>
        <div className="sm:col-span-2">{texto("diagnostico", "Diagnóstico principal")}</div>
        {texto("cid", "CID-10", { maxLength: 10, autoCapitalize: "characters" })}
        {texto("origem", "Origem do encaminhamento", { placeholder: "Hospital, UBS, UPA…" })}
        <div>
          <label htmlFor="modalidade" className="rotulo">Modalidade</label>
          <select id="modalidade" name="modalidade" defaultValue={v("modalidade")} className="campo">
            <option value="">—</option>
            {MODALIDADES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        {texto("data_admissao", "Data de admissão no programa", { type: "date" })}
        <div className="sm:col-span-2">
          {texto("dispositivos", "Dispositivos / cuidados especiais", {
            placeholder: "Sonda, traqueostomia, O₂, curativos, estomias…",
          })}
        </div>
        <label className="flex min-h-12 items-center gap-2.5 text-[15px] font-medium text-heading">
          <input type="checkbox" name="possui_lpp" value="sim" defaultChecked={v("possui_lpp") === "sim"} className="h-5 w-5 accent-[#1d6f57]" />
          Paciente com lesão por pressão (LPP)
        </label>
        {texto("proxima_visita", "Próxima visita", { type: "date" })}
        <div className="sm:col-span-2">
          <label htmlFor="observacoes" className="rotulo">Observações</label>
          <textarea id="observacoes" name="observacoes" rows={4} defaultValue={v("observacoes")} className="campo" />
        </div>
      </fieldset>

      <fieldset className="cartao grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Situação</legend>
        <h2 className="text-base font-bold text-heading sm:col-span-2">Situação</h2>
        <div>
          <label htmlFor="status" className="rotulo">Situação atual</label>
          <select id="status" name="status" defaultValue={v("status") || "ativo"} className="campo">
            {STATUS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
          </select>
        </div>
        {texto("data_saida", "Data de alta / saída", { type: "date" })}
        <div className="sm:col-span-2">{texto("motivo_saida", "Motivo da alta / saída")}</div>
      </fieldset>

      {estado.erro && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger-strong">{estado.erro}</p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={id ? `/pacientes/${id}` : "/"} className="btn-secundario">Cancelar</Link>
        <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar paciente"}</button>
      </div>
    </form>
  );
}
