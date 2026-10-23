import { exigirPermissao } from "@/lib/auth";
import { listarPerfis } from "@/lib/pacientes";
import { infoUsuarios } from "@/lib/usuarios";
import { EquipeConteudo } from "./conteudo";

export default async function Equipe() {
  const eu = await exigirPermissao("admin");
  const [perfis, info] = await Promise.all([listarPerfis(), infoUsuarios()]);
  return <EquipeConteudo perfis={perfis} info={info} euId={eu.id} />;
}
