import { formatarDataHora } from "@/lib/opcoes";
import type { Perfil } from "@/lib/pacientes";
import type { InfoUsuario } from "@/lib/usuarios";
import { atualizarPerfil } from "../../actions";
import { IconeMais } from "../icones";
import { FormNovoUsuario } from "./form-novo-usuario";

const PERSONALIZADAS = [
  ["pode_cadastrar", "Cadastrar", "Criar novos pacientes"],
  ["pode_editar", "Editar", "Corrigir dados, registrar visitas, procedimentos e trocas"],
  ["pode_exportar", "Exportar", "Baixar listas em CSV e gerar relatórios em PDF"],
] as const;

function perfilAtual(p: Perfil) {
  if (p.admin) return "admin";
  if (!p.pode_cadastrar && !p.pode_editar && !p.pode_exportar) return "visualizacao";
  return "personalizado";
}

type Props = { perfis: Perfil[]; info: { disponivel: boolean; mapa: Map<string, InfoUsuario> }; euId: string };

export function EquipeConteudo({ perfis, info, euId }: Props) {
  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">Acesso e proteção dos dados</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Equipe<span className="text-accent">.</span></h1>
        <p className="m-0 mt-1 text-sm text-muted">
          Cada profissional tem o seu login. O <strong className="text-heading">administrador</strong> cadastra pacientes e altera tudo; os demais usuários
          entram só para <strong className="text-heading">visualizar</strong>.
        </p>
      </header>

      <details className="cartao" open={perfis.length < 3}>
        <summary className="flex cursor-pointer list-none items-center gap-2 text-base font-bold text-heading">
          <IconeMais className="h-5 w-5 text-accent" /> Cadastrar novo usuário
        </summary>
        <div className="mt-4">
          {info.disponivel ? (
            <FormNovoUsuario />
          ) : (
            <p className="m-0 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-strong">
              O cadastro de usuários pelo site precisa da <strong>chave de administração do Supabase</strong> na Vercel
              (<code>SUPABASE_SERVICE_ROLE_KEY</code>, em Settings → Environment Variables). Enquanto isso, crie o usuário no Supabase
              (Authentication → Users) e ajuste o perfil aqui.
            </p>
          )}
        </div>
      </details>

      <section aria-label="Usuários" className="grid gap-3">
        <h2 className="m-0 text-base font-bold text-heading">
          Usuários <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-muted">{perfis.length}</span>
        </h2>
        <ul className="m-0 grid list-none gap-3 p-0">
          {perfis.map((p) => {
            const proprio = p.user_id === euId;
            const dados = info.mapa.get(p.user_id);
            return (
              <li key={p.user_id}>
                <form action={atualizarPerfil.bind(null, p.user_id)} className="cartao grid gap-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1 basis-60">
                      <label htmlFor={`n-${p.user_id}`} className="rotulo">Nome (aparece no histórico)</label>
                      <input id={`n-${p.user_id}`} name="nome" defaultValue={p.nome} className="campo" />
                      {dados && (
                        <p className="mb-0 mt-1 break-all text-xs text-muted">
                          {dados.email}
                          {dados.ultimoAcesso ? ` · último acesso ${formatarDataHora(dados.ultimoAcesso)}` : " · nunca entrou"}
                        </p>
                      )}
                    </div>
                    <div className="basis-60">
                      <label htmlFor={`p-${p.user_id}`} className="rotulo">Perfil de acesso</label>
                      <select id={`p-${p.user_id}`} name="perfil" defaultValue={perfilAtual(p)} disabled={proprio} className="campo">
                        <option value="admin">Administrador (pode tudo)</option>
                        <option value="visualizacao">Somente visualização</option>
                        <option value="personalizado">Personalizado</option>
                      </select>
                    </div>
                    <div className="self-end"><button className="btn-primario !min-h-12">Salvar</button></div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-heading">
                      <input type="checkbox" name="ativo" defaultChecked={p.ativo} disabled={proprio} className="h-5 w-5 accent-[#1d6f57]" />
                      Acesso ativo
                    </label>
                    {!proprio && (
                      <details className="text-sm">
                        <summary className="cursor-pointer font-semibold text-accent">Permissões personalizadas</summary>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {PERSONALIZADAS.map(([campo, rotulo, dica]) => (
                            <label key={campo} title={dica} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-heading">
                              <input type="checkbox" name={campo} defaultChecked={p[campo]} className="h-4 w-4 accent-[#1d6f57]" />
                              {rotulo}
                            </label>
                          ))}
                        </div>
                        <p className="mb-0 mt-2 text-xs text-muted">Só valem quando o perfil estiver em “Personalizado”.</p>
                      </details>
                    )}
                  </div>
                  {proprio && (
                    <p className="m-0 text-xs text-muted">Este é o seu usuário: você não pode se desativar nem tirar o seu acesso de administrador.</p>
                  )}
                </form>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
