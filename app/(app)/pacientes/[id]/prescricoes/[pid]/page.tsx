import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { exigirPermissao } from "@/lib/auth";
import { obterFicha } from "@/lib/pacientes";
import { obterPrescricao } from "@/lib/prescricoes";
import { FormPrescricao } from "../form-prescricao";

export default async function EditarPrescricao({ params }: PageProps<"/pacientes/[id]/prescricoes/[pid]">) {
  const usuario = await exigirPermissao("prescrever");
  const { id, pid } = await params;
  const [ficha, presc] = await Promise.all([obterFicha(Number(id)), obterPrescricao(Number(pid))]);
  if (!ficha || !presc || presc.paciente_id !== ficha.id) notFound();
  // só o autor ou o administrador alteram (o banco também confere)
  if (!usuario.perms.admin && presc.usuario_id !== usuario.id) redirect(`/prescricoes?paciente=${ficha.id}`);

  return (
    <div className="grid gap-4">
      <Link href={`/prescricoes?paciente=${ficha.id}`} className="text-sm font-semibold text-accent hover:underline">← Voltar às prescrições</Link>
      <header>
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em] text-heading">Editar prescrição</h1>
        <p className="mb-0 mt-1 text-sm text-muted">{ficha.nome} · prontuário {ficha.prontuario}</p>
      </header>
      <FormPrescricao
        pacienteId={ficha.id}
        id={presc.id}
        inicial={{ data: presc.data, datas_aprazamento: presc.datas_aprazamento, itens: presc.itens, observacoes: presc.observacoes ?? "" }}
      />
    </div>
  );
}
