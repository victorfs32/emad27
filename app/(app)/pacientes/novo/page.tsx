import { FormularioPaciente } from "../formulario";

export default function NovoPaciente() {
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-heading">Novo paciente</h1>
      <FormularioPaciente id={null} inicial={{ status: "ativo" }} />
    </div>
  );
}
