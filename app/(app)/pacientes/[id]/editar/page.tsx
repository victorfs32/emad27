import { notFound } from "next/navigation";
import { obterPaciente } from "@/lib/pacientes";
import { FormularioPaciente } from "../../formulario";

export default async function EditarPaciente({ params }: PageProps<"/pacientes/[id]/editar">) {
  const { id } = await params;
  const paciente = await obterPaciente(Number(id));
  if (!paciente) notFound();

  const inicial = Object.fromEntries(
    Object.entries(paciente).map(([k, v]) => [k, v == null ? "" : String(v)]),
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Editar paciente</h1>
      <FormularioPaciente id={paciente.id} inicial={inicial} />
    </div>
  );
}
