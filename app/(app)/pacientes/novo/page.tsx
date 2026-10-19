import { exigirPermissao } from "@/lib/auth";
import { formularioVazio } from "@/lib/formulario";
import { listarBairros, listarUapss } from "@/lib/pacientes";
import { hojeISO } from "@/lib/opcoes";
import { FormularioPaciente } from "../formulario";

export default async function NovoPaciente() {
  await exigirPermissao("cadastrar");
  const [uapss, bairros] = await Promise.all([listarUapss(), listarBairros()]);
  return (
    <div className="grid gap-4">
      <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em] text-heading">Novo paciente</h1>
      <FormularioPaciente id={null} inicial={{ ...formularioVazio(), admissao: hojeISO() }} uapss={uapss} bairros={bairros} />
    </div>
  );
}
