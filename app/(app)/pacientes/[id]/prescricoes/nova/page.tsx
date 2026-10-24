import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPermissao } from "@/lib/auth";
import { obterFicha } from "@/lib/pacientes";
import { obterPrescricao } from "@/lib/prescricoes";
import { hojeISO } from "@/lib/opcoes";
import { formularioPrescricaoVazio, type DadosFormPrescricao } from "@/lib/prescricao-tipos";
import { FormPrescricao } from "../form-prescricao";

export default async function NovaPrescricao({ params, searchParams }: PageProps<"/pacientes/[id]/prescricoes/nova">) {
  await connection();
  await exigirPermissao("prescrever");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const ficha = await obterFicha(Number(id));
  if (!ficha) notFound();

  const hoje = hojeISO();
  let inicial: DadosFormPrescricao = formularioPrescricaoVazio(hoje);
  const copiar = typeof sp.copiar === "string" ? Number(sp.copiar) : NaN;
  let renovacao = false;
  if (Number.isSafeInteger(copiar)) {
    const antiga = await obterPrescricao(copiar);
    if (antiga && antiga.paciente_id === ficha.id) {
      renovacao = true;
      inicial = {
        data: hoje,
        datas_aprazamento: formularioPrescricaoVazio(hoje).datas_aprazamento,
        observacoes: antiga.observacoes ?? "",
        itens: antiga.itens.map((i) => ({ data: hoje, texto: i.texto, aprazamento: ["", "", "", "", ""] })),
      };
    }
  }

  return (
    <div className="grid gap-4">
      <Link href={`/prescricoes?paciente=${ficha.id}`} className="text-sm font-semibold text-accent hover:underline">← Voltar às prescrições</Link>
      <header>
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em] text-heading">{renovacao ? "Renovar prescrição" : "Nova prescrição"}</h1>
        <p className="mb-0 mt-1 text-sm text-muted">{ficha.nome} · prontuário {ficha.prontuario}</p>
        {renovacao && <p className="mb-0 mt-1 text-sm text-muted">Itens copiados da prescrição anterior; confira doses e ajuste o que mudou antes de salvar.</p>}
      </header>
      <FormPrescricao pacienteId={ficha.id} id={null} inicial={inicial} />
    </div>
  );
}
