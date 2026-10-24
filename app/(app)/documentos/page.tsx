import { connection } from "next/server";
import { exigirUsuario } from "@/lib/auth";
import { listarPacientesBasico } from "@/lib/pacientes";
import { hojeISO } from "@/lib/opcoes";
import { FormAutomatico } from "./form-automatico";
import { FormReceituario } from "./form-receituario";

export default async function Documentos() {
  await connection();
  const usuario = await exigirUsuario();
  const pacientes = await listarPacientesBasico();

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">EMAD 27 · Documentos</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Documentos<span className="text-accent">.</span></h1>
        <p className="m-0 mt-1 text-sm text-muted">Formulários do programa com os dados do paciente preenchidos automaticamente, em PDF para assinatura e carimbo.</p>
      </header>

      <section className="cartao grid gap-4">
        <h2 className="m-0 text-base font-bold text-heading">Receituário médico</h2>
        {usuario.perms.prescrever ? (
          <FormReceituario pacientes={pacientes} hoje={hojeISO()} />
        ) : (
          <p className="m-0 text-sm text-muted">Somente quem tem a permissão “Prescrever” gera receituários. Peça à coordenação, em Equipe.</p>
        )}
      </section>
      <section className="cartao grid gap-4">
        <div>
          <h2 className="m-0 text-base font-bold text-heading">Requerimento para solicitação de dieta enteral</h2>
          <p className="mb-0 mt-1 text-sm text-muted">Sai pronto: nome, nascimento, CNS, diagnósticos e via de alimentação vêm do cadastro; a data é a de hoje.</p>
        </div>
        {usuario.perms.exportar ? (
          <FormAutomatico tipo="dieta_enteral" pacientes={pacientes} botao="Gerar requerimento em PDF" />
        ) : (
          <p className="m-0 text-sm text-muted">Você não tem permissão para gerar documentos. Peça à coordenação, em Equipe.</p>
        )}
      </section>
    </div>
  );
}
