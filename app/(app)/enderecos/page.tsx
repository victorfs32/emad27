import { connection } from "next/server";
import { listarEnderecos } from "@/lib/pacientes";
import { ListaEnderecos } from "./lista-enderecos";

export default async function Enderecos() {
  await connection();
  const pacientes = await listarEnderecos();

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">EMAD 27 · Transporte</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Endereços<span className="text-accent">.</span></h1>
        <p className="m-0 mt-1 text-sm text-muted">Toque no nome do paciente para ver o endereço e os telefones de contato e levar a equipe até o domicílio.</p>
      </header>
      <ListaEnderecos pacientes={pacientes} />
    </div>
  );
}
