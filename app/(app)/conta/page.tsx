import { exigirUsuario } from "@/lib/auth";
import { FormCarimbo } from "./form-carimbo";
import { FormSenha } from "./form-senha";

export default async function Conta() {
  const u = await exigirUsuario();
  const papel = u.perms.admin
    ? "Administrador: pode cadastrar pacientes, editar tudo, exportar e gerenciar a equipe."
    : u.perms.cadastrar || u.perms.editar || u.perms.exportar || u.perms.prescrever
      ? "Acesso personalizado: algumas ações de cadastro, edição ou exportação estão liberadas para você."
      : "Somente visualização: você consulta as fichas e as listas, sem alterar nada.";

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">Seu acesso</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Minha conta<span className="text-accent">.</span></h1>
      </header>

      <section className="cartao grid gap-3">
        <h2 className="m-0 text-base font-bold text-heading">Dados do acesso</h2>
        <dl className="m-0 grid gap-3 sm:grid-cols-2">
          <div><dt className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">Nome</dt><dd className="m-0 mt-1 text-heading">{u.nome}</dd></div>
          <div><dt className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">E-mail (login)</dt><dd className="m-0 mt-1 break-all text-heading">{u.email}</dd></div>
          <div className="sm:col-span-2"><dt className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">Perfil</dt><dd className="m-0 mt-1 text-heading">{papel}</dd></div>
        </dl>
      </section>

      <section className="cartao grid gap-4">
        <div>
          <h2 className="m-0 text-base font-bold text-heading">Meu carimbo</h2>
          <p className="mb-0 mt-1 text-sm text-muted">Cargo e registro profissional. Saem impressos acima da assinatura nos documentos que você gerar, como no carimbo de papel.</p>
        </div>
        <FormCarimbo nome={u.nome} cargo={u.cargo} registro={u.registro} especialista={u.registroEspecialista} />
      </section>

      <section className="cartao grid gap-4">
        <div>
          <h2 className="m-0 text-base font-bold text-heading">Alterar senha</h2>
          <p className="mb-0 mt-1 text-sm text-muted">Só você deve saber a sua senha. Não compartilhe com ninguém, nem com a coordenação.</p>
        </div>
        <FormSenha />
      </section>
    </div>
  );
}
