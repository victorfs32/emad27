import "server-only";
import { exigirUsuario } from "./auth";
import { supabaseServidor } from "./supabase/servidor";
import { supabaseAdmin } from "./supabase/admin";
import { emailValido, problemaNaSenha, soDigitos } from "./validacao";
import { problemaNaIdentificacao, type IdentificacaoProfissional } from "./profissional";

export type PerfilNovo = "visualizacao" | "admin";
export type DadosNovoUsuario = { nome: string; email: string; senha: string; perfil: string } & Partial<IdentificacaoProfissional>;

/** Cadastra um novo usuário (login) e o perfil de acesso. Só administradores. */
export async function criarUsuario(d: DadosNovoUsuario): Promise<{ erro?: string }> {
  const eu = await exigirUsuario();
  if (!eu.perms.admin) return { erro: "Somente administradores podem cadastrar usuários." };

  const nome = d.nome.trim().replace(/\s+/g, " ");
  const email = d.email.trim().toLowerCase();
  if (nome.length < 2 || nome.length > 120) return { erro: "Informe o nome do usuário." };
  if (!emailValido(email)) return { erro: "Informe um e-mail válido." };
  const problema = problemaNaSenha(d.senha);
  if (problema) return { erro: problema };
  const problemaId = problemaNaIdentificacao(d);
  if (problemaId) return { erro: problemaId };
  const perfil: PerfilNovo = d.perfil === "admin" ? "admin" : "visualizacao";

  const admin = supabaseAdmin();
  if (!admin) {
    return {
      erro: "O cadastro de usuários pelo site precisa da chave de administração do Supabase (SUPABASE_SERVICE_ROLE_KEY) configurada na Vercel.",
    };
  }

  const r = await admin.auth.admin.createUser({
    email,
    password: d.senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (r.error || !r.data.user) {
    const codigo = r.error?.code ?? "";
    const msg = r.error?.message ?? "";
    console.error("[criarUsuario]", codigo || msg);
    if (codigo === "email_exists" || /already (been )?registered|already exists/i.test(msg)) return { erro: "Já existe um usuário com este e-mail." };
    if (codigo === "weak_password" || /password/i.test(msg)) return { erro: "O Supabase recusou essa senha. Use uma senha maior e menos comum." };
    return { erro: "Não foi possível cadastrar o usuário. Tente novamente." };
  }

  // O banco cria o perfil de consulta automaticamente; aqui garantimos o perfil escolhido.
  const ehAdmin = perfil === "admin";
  const p = await admin.from("perfis").upsert(
    { user_id: r.data.user.id, nome, ativo: true, admin: ehAdmin, pode_cadastrar: ehAdmin, pode_editar: ehAdmin, pode_exportar: ehAdmin, pode_prescrever: ehAdmin, cpf: soDigitos(d.cpf ?? "") || null, cns: soDigitos(d.cns ?? "") || null, cbo: soDigitos(d.cbo ?? "") || null, cnes: soDigitos(d.cnes ?? "") || null, ine: soDigitos(d.ine ?? "") || null },
    { onConflict: "user_id" },
  );
  if (p.error) {
    console.error("[criarUsuario:perfil]", p.error.message);
    return { erro: "O login foi criado, mas não foi possível definir o perfil. Ajuste em Equipe." };
  }
  console.info("[equipe] usuário criado", { por: eu.id, novo: r.data.user.id, perfil });
  return {};
}

export type InfoUsuario = { email: string | null; ultimoAcesso: string | null };

/** E-mail e último acesso de cada usuário (precisa da chave de administração). */
export async function infoUsuarios(): Promise<{ disponivel: boolean; mapa: Map<string, InfoUsuario> }> {
  const eu = await exigirUsuario();
  const mapa = new Map<string, InfoUsuario>();
  const admin = supabaseAdmin();
  if (!eu.perms.admin || !admin) return { disponivel: false, mapa };
  const r = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (r.error) {
    console.error("[infoUsuarios]", r.error.message);
    return { disponivel: false, mapa };
  }
  for (const u of r.data.users) mapa.set(u.id, { email: u.email ?? null, ultimoAcesso: u.last_sign_in_at ?? null });
  return { disponivel: true, mapa };
}

/** Troca a senha do próprio usuário, conferindo a senha atual. */
export async function trocarSenhaPropria(atual: string, nova: string): Promise<{ erro?: string }> {
  const u = await exigirUsuario();
  const problema = problemaNaSenha(nova);
  if (problema) return { erro: problema };
  if (atual === nova) return { erro: "A nova senha precisa ser diferente da atual." };

  const sb = await supabaseServidor();
  const conferir = await sb.auth.signInWithPassword({ email: u.email, password: atual });
  if (conferir.error) return { erro: "A senha atual está incorreta." };

  const r = await sb.auth.updateUser({ password: nova });
  if (r.error) {
    console.error("[trocarSenha]", r.error.code ?? r.error.message);
    if (r.error.code === "same_password") return { erro: "A nova senha precisa ser diferente da atual." };
    if (r.error.code === "weak_password") return { erro: "Essa senha é fraca demais. Use uma senha maior e menos comum." };
    return { erro: "Não foi possível alterar a senha. Tente novamente." };
  }
  return {};
}
