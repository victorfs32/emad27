import Link from "next/link";
import { connection } from "next/server";
import { exigirUsuario } from "@/lib/auth";
import { listarPacientesBasico } from "@/lib/pacientes";
import { listarPrescricoes, listarPrescricoesRecentes, type PrescricaoComPaciente } from "@/lib/prescricoes";
import { formatarData } from "@/lib/opcoes";
import { BotaoPrescricao } from "../pacientes/[id]/botao-prescricao";
import { AcoesPrescricao } from "../pacientes/[id]/prescricoes/acoes-prescricao";
import { IconePrescricao } from "../icones";
import { EscolherPaciente } from "./escolher-paciente";

export default async function Prescricoes({ searchParams }: PageProps<"/prescricoes">) {
  await connection();
  const sp = await searchParams;
  const usuario = await exigirUsuario();
  const perms = usuario.perms;
  const pacientes = await listarPacientesBasico();

  const escolhido = typeof sp.paciente === "string" ? pacientes.find((p) => String(p.id) === sp.paciente) ?? null : null;
  const lista: PrescricaoComPaciente[] = escolhido
    ? (await listarPrescricoes(escolhido.id)).map((p) => ({ ...p, paciente_id: escolhido.id, paciente: escolhido.nome, prontuario: escolhido.prontuario }))
    : await listarPrescricoesRecentes(30);

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">EMAD 27 · Prescrições</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Prescrições médicas<span className="text-accent">.</span></h1>
        <p className="m-0 mt-1 text-sm text-muted">
          Escolha o paciente, digite a prescrição e imprima o formulário já preenchido, para assinatura e carimbo.
        </p>
      </header>

      <section className="cartao grid gap-4">
        <EscolherPaciente pacientes={pacientes} atual={escolhido?.id ?? null} />
        {escolhido && (
          <div className="flex flex-wrap items-start gap-3">
            {perms.prescrever && <Link href={`/pacientes/${escolhido.id}/prescricoes/nova`} className="btn-primario">Nova prescrição</Link>}
            {perms.exportar && <BotaoPrescricao pacienteId={escolhido.id} />}
            <Link href={`/pacientes/${escolhido.id}`} className="btn-secundario">Abrir ficha do paciente</Link>
          </div>
        )}
        {!escolhido && perms.prescrever && <p className="m-0 text-sm text-muted">Escolha um paciente para criar uma nova prescrição.</p>}
      </section>

      <section className="grid gap-3">
        <h2 className="m-0 text-base font-bold text-heading">{escolhido ? `Prescrições de ${escolhido.nome}` : "Mais recentes"}</h2>
        {lista.length === 0 ? (
          <div className="rounded-[22px] border border-border bg-surface px-5 py-12 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><IconePrescricao className="h-7 w-7" /></span>
            <p className="mb-0 mt-3 font-bold text-heading">Nenhuma prescrição digitada {escolhido ? "para este paciente" : "ainda"}</p>
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {lista.map((p) => (
              <li key={p.id} className="cartao grid gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong className="text-heading">
                    {formatarData(p.data)}
                    {!escolhido && <> · <Link href={`/prescricoes?paciente=${p.paciente_id}`} className="hover:text-accent">{p.paciente}</Link></>}
                  </strong>
                  <span className="text-sm text-muted">{p.autor} · {p.itens.length} {p.itens.length === 1 ? "item" : "itens"}</span>
                </div>
                <ol className="m-0 grid gap-1 pl-5 text-sm text-heading">
                  {p.itens.slice(0, 6).map((it, i) => <li key={i} className="whitespace-pre-wrap break-words">{it.texto}</li>)}
                </ol>
                {p.itens.length > 6 && <p className="m-0 text-xs text-muted">+ {p.itens.length - 6} itens no formulário</p>}
                {p.observacoes && <p className="m-0 whitespace-pre-wrap text-sm italic text-muted">Obs.: {p.observacoes}</p>}
                <AcoesPrescricao
                  pacienteId={p.paciente_id}
                  id={p.id}
                  podeImprimir={perms.exportar}
                  podePrescrever={perms.prescrever}
                  podeAlterar={perms.admin || p.usuario_id === usuario.id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
