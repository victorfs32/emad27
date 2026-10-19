import { notFound } from "next/navigation";
import { exigirPermissao } from "@/lib/auth";
import { listarBairros, listarUapss, obterFicha, paraFormulario } from "@/lib/pacientes";
import { FormularioPaciente } from "../../formulario";

export default async function EditarPaciente({ params }: PageProps<"/pacientes/[id]/editar">) {
  await exigirPermissao("editar");
  const { id } = await params;
  const [ficha, uapss, bairros] = await Promise.all([obterFicha(Number(id)), listarUapss(), listarBairros()]);
  if (!ficha) notFound();

  return (
    <div className="grid gap-4">
      <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em] text-heading">Editar paciente</h1>
      <FormularioPaciente id={ficha.id} inicial={paraFormulario(ficha)} uapss={uapss} bairros={bairros} />
    </div>
  );
}
