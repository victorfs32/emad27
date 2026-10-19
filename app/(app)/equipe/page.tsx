import { exigirPermissao } from "@/lib/auth";
import { listarPerfis } from "@/lib/pacientes";
import { atualizarPerfil } from "../../actions";

const PERMISSOES = [
  ["ativo", "Acesso ativo", "Pode entrar e consultar as fichas"],
  ["pode_cadastrar", "Cadastrar", "Criar novos pacientes"],
  ["pode_editar", "Editar", "Corrigir dados, registrar evolução e agendar visitas"],
  ["pode_exportar", "Exportar", "Baixar listas em CSV"],
  ["admin", "Administrador", "Tudo acima e gerenciar a equipe"],
] as const;

export default async function Equipe() {
  const eu = await exigirPermissao("admin");
  const perfis = await listarPerfis();

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">Acesso e proteção dos dados</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Equipe<span className="text-accent">.</span></h1>
        <p className="m-0 mt-1 text-sm text-muted">
          Cada profissional tem seu login. Para adicionar alguém, crie o usuário no Supabase (Authentication → Users) com e-mail e senha;
          ele aparece aqui só com permissão de consulta.
        </p>
      </header>

      <ul className="m-0 grid list-none gap-3 p-0">
        {perfis.map((p) => (
          <li key={p.user_id}>
            <form action={atualizarPerfil.bind(null, p.user_id)} className="cartao grid gap-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1">
                  <label htmlFor={`n-${p.user_id}`} className="rotulo">Nome (aparece no histórico)</label>
                  <input id={`n-${p.user_id}`} name="nome" defaultValue={p.nome} className="campo" />
                </div>
                <button className="btn-primario !min-h-12">Salvar</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PERMISSOES.map(([campo, rotulo, dica]) => {
                  const proprio = p.user_id === eu.id && (campo === "ativo" || campo === "admin");
                  return (
                    <label key={campo} title={dica} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-heading">
                      <input type="checkbox" name={campo} defaultChecked={p[campo]} disabled={proprio} className="h-4 w-4 accent-[#1d6f57]" />
                      {rotulo}
                    </label>
                  );
                })}
              </div>
              {p.user_id === eu.id && <p className="m-0 text-xs text-muted">Este é o seu usuário: você não pode se desativar nem remover seu acesso de administrador.</p>}
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
