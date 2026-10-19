import { FormularioPaciente } from "../formulario";

export default function NovoPaciente() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Novo paciente</h1>
      <FormularioPaciente id={null} inicial={{ status: "ativo" }} />
    </div>
  );
}
