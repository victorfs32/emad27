import { connection } from "next/server";
import { exigirUsuario } from "@/lib/auth";
import { listarPacientesBasico } from "@/lib/pacientes";
import { hojeISO } from "@/lib/opcoes";
import { FormAntimicrobiano } from "./form-antimicrobiano";
import { FormAtestado } from "./form-atestado";
import { FormAutomatico } from "./form-automatico";
import { FormControleEspecial } from "./form-controle-especial";
import { FormElegibilidade } from "./form-elegibilidade";
import { FormExames } from "./form-exames";
import { FormFraldas } from "./form-fraldas";
import { FormIaec } from "./form-iaec";
import { FormMedicamentosEspeciais } from "./form-medicamentos-especiais";
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
          <FormReceituario carimbo={usuario.carimbo} pacientes={pacientes} hoje={hojeISO()} />
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
          <FormAutomatico carimbo={usuario.carimbo} tipo="dieta_enteral" pacientes={pacientes} botao="Gerar requerimento em PDF" />
        ) : (
          <p className="m-0 text-sm text-muted">Você não tem permissão para gerar documentos. Peça à coordenação, em Equipe.</p>
        )}
      </section>
      <section className="cartao grid gap-4">
        <div>
          <h2 className="m-0 text-base font-bold text-heading">Ficha de antimicrobiano</h2>
          <p className="mb-0 mt-1 text-sm text-muted">Identificação do paciente vem do cadastro; você marca o foco, a origem e escreve a prescrição.</p>
        </div>
        {usuario.perms.prescrever ? (
          <FormAntimicrobiano carimbo={usuario.carimbo} pacientes={pacientes} hoje={hojeISO()} />
        ) : (
          <p className="m-0 text-sm text-muted">Somente quem tem a permissão “Prescrever” gera este documento. Peça à coordenação, em Equipe.</p>
        )}
      </section>
      <section className="cartao grid gap-4">
        <div>
          <h2 className="m-0 text-base font-bold text-heading">Requerimento para fraldas descartáveis</h2>
          <p className="mb-0 mt-1 text-sm text-muted">Nome, CNS, nascimento e diagnósticos vêm do cadastro; você informa tipo, marca, tamanho e quantidade.</p>
        </div>
        {usuario.perms.prescrever ? (
          <FormFraldas carimbo={usuario.carimbo} pacientes={pacientes} hoje={hojeISO()} />
        ) : (
          <p className="m-0 text-sm text-muted">Somente quem tem a permissão “Prescrever” gera este documento. Peça à coordenação, em Equipe.</p>
        )}
      </section>
      <section className="cartao grid gap-4">
        <div>
          <h2 className="m-0 text-base font-bold text-heading">Solicitação de exames</h2>
          <p className="mb-0 mt-1 text-sm text-muted">Dados do paciente, mãe e endereço vêm do cadastro; você marca os exames. Sai em duas vias.</p>
        </div>
        {usuario.perms.prescrever ? (
          <FormExames carimbo={usuario.carimbo} pacientes={pacientes} hoje={hojeISO()} />
        ) : (
          <p className="m-0 text-sm text-muted">Somente quem tem a permissão “Prescrever” gera este documento. Peça à coordenação, em Equipe.</p>
        )}
      </section>
      <section className="cartao grid gap-4">
        <div>
          <h2 className="m-0 text-base font-bold text-heading">Receituário de controle especial</h2>
          <p className="mb-0 mt-1 text-sm text-muted">Paciente e endereço vêm do cadastro; você escreve a prescrição. Sai em duas vias (farmácia e paciente), com CNPJ do programa.</p>
        </div>
        {usuario.perms.prescrever ? (
          <FormControleEspecial carimbo={usuario.carimbo} pacientes={pacientes} hoje={hojeISO()} />
        ) : (
          <p className="m-0 text-sm text-muted">Somente quem tem a permissão “Prescrever” gera este documento. Peça à coordenação, em Equipe.</p>
        )}
      </section>
      <section className="cartao grid gap-4">
        <div>
          <h2 className="m-0 text-base font-bold text-heading">Solicitação de medicamentos especiais</h2>
          <p className="mb-0 mt-1 text-sm text-muted">Laudo do Componente Especializado da Assistência Farmacêutica: paciente, mãe, CID, diagnóstico, telefone e documento vêm do cadastro.</p>
        </div>
        {usuario.perms.prescrever ? (
          <FormMedicamentosEspeciais profissional={usuario} carimbo={usuario.carimbo} pacientes={pacientes} hoje={hojeISO()} />
        ) : (
          <p className="m-0 text-sm text-muted">Somente quem tem a permissão “Prescrever” gera este documento. Peça à coordenação, em Equipe.</p>
        )}
      </section>
      <section className="cartao grid gap-4">
        <div>
          <h2 className="m-0 text-base font-bold text-heading">Avaliação de elegibilidade e admissão</h2>
          <p className="mb-0 mt-1 text-sm text-muted">Ficha e-SUS AB (SAD): identificação, endereço, telefones, CIDs, cuidador e condições conhecidas vêm do cadastro.</p>
        </div>
        {usuario.perms.prescrever ? (
          <FormElegibilidade profissional={usuario} pacientes={pacientes} hoje={hojeISO()} />
        ) : (
          <p className="m-0 text-sm text-muted">Somente quem tem a permissão “Prescrever” gera este documento. Peça à coordenação, em Equipe.</p>
        )}
      </section>
      <section className="cartao grid gap-4">
        <div>
          <h2 className="m-0 text-base font-bold text-heading">IAEC-AD — elegibilidade e complexidade da atenção domiciliar</h2>
          <p className="mb-0 mt-1 text-sm text-muted">Você marca as respostas; os pontos de cada bloco, a pontuação final e a modalidade (AD1, AD2 ou AD3) são calculados sozinhos.</p>
        </div>
        {usuario.perms.prescrever ? (
          <FormIaec pacientes={pacientes} hoje={hojeISO()} />
        ) : (
          <p className="m-0 text-sm text-muted">Somente quem tem a permissão “Prescrever” gera este documento. Peça à coordenação, em Equipe.</p>
        )}
      </section>
      <section className="cartao grid gap-4">
        <h2 className="m-0 text-base font-bold text-heading">Atestado médico</h2>
        {usuario.perms.prescrever ? (
          <FormAtestado carimbo={usuario.carimbo} pacientes={pacientes} hoje={hojeISO()} />
        ) : (
          <p className="m-0 text-sm text-muted">Somente quem tem a permissão “Prescrever” gera atestados. Peça à coordenação, em Equipe.</p>
        )}
      </section>
    </div>
  );
}
