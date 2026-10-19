import { lerFiltros, listarParaExportar, type Ficha } from "@/lib/pacientes";
import { exigirPermissao } from "@/lib/auth";
import {
  CONTINENCIA, DIURESE, FISIO, SITUACOES, TIPOS_DISPOSITIVO, VIAS_DIETA, calcularIdade, formatarData, rotulo, simNao,
} from "@/lib/opcoes";
import { formatarCns, formatarCpf, formatarTelefone } from "@/lib/validacao";

// Exporta a lista (com os mesmos filtros da tela) em CSV: separador ";" e BOM para abrir certo no Excel.
// Exige permissão de exportação; sem ela (ou sem login) redireciona.
export async function GET(request: Request) {
  await exigirPermissao("exportar");
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const base = lerFiltros(params, "principais");
  const todos = new URL(request.url).searchParams.get("grupo") === "todos";
  const fichas = (
    todos
      ? [...(await listarParaExportar({ ...base, grupo: "principais" })), ...(await listarParaExportar({ ...base, grupo: "arquivados" }))]
      : await listarParaExportar(base)
  );

  const principal = (f: Ficha) => f.cuidadores.find((c) => c.principal) ?? f.cuidadores[0];
  const colunas: [string, (f: Ficha) => string | null][] = [
    ["Prontuário", (f) => f.prontuario],
    ["Paciente", (f) => f.nome],
    ["Idade", (f) => String(calcularIdade(f.data_nascimento) ?? "")],
    ["Nascimento", (f) => (f.data_nascimento ? formatarData(f.data_nascimento) : "")],
    ["UAPS", (f) => f.uaps?.nome ?? ""],
    ["Situação", (f) => rotulo(SITUACOES, f.situacao) ?? f.situacao],
    ["Modalidade", (f) => f.modalidade],
    ["Admissão", (f) => formatarData(f.admissao)],
    ["CPF", (f) => (f.cpf ? formatarCpf(f.cpf) : "")],
    ["CNS", (f) => (f.cns ? formatarCns(f.cns) : "")],
    ["RG", (f) => f.rg],
    ["Nome da mãe", (f) => f.nome_mae],
    ["Telefones", (f) => f.telefones.map((t) => `${formatarTelefone(t.numero)} (${t.de_quem})`).join(" | ")],
    ["Município", (f) => f.municipio],
    ["Bairro", (f) => f.bairro],
    ["Endereço", (f) => [f.rua, f.numero, f.complemento].filter(Boolean).join(", ")],
    ["Cuidador principal", (f) => principal(f)?.nome ?? ""],
    ["Telefone do cuidador", (f) => (principal(f)?.telefone ? formatarTelefone(principal(f)!.telefone!) : "")],
    ["CID", (f) => f.diagnosticos.map((d) => `${d.cid}${d.principal ? "*" : ""}`).join(" | ")],
    ["Fisioterapia", (f) => (f.fisio ? rotulo(FISIO, f.fisio) ?? "" : "Não informado")],
    ["Dieta", (f) => (f.dieta_vias.length ? f.dieta_vias.map((v) => rotulo(VIAS_DIETA, v)).join(" | ") : "Não informado")],
    ["Diurese", (f) => (f.diurese ? rotulo(DIURESE, f.diurese) ?? "" : "Não informado")],
    ["Fralda", (f) => simNao(f.usa_fralda)],
    ["Continência", (f) => (f.continencia ? rotulo(CONTINENCIA, f.continencia) ?? "" : "Não informado")],
    ["TQT", (f) => simNao(f.tqt)],
    ["LPP", (f) => simNao(f.lpp)],
    ["Oxigênio", (f) => simNao(f.o2)],
    ["Fluxo O₂ (L/min)", (f) => (f.o2_fluxo === null ? "" : String(f.o2_fluxo))],
    ["Dispositivos (número / troca / próxima troca)", (f) =>
      f.dispositivos
        .map((d) => `${TIPOS_DISPOSITIVO.find((t) => t.valor === d.tipo)?.sigla ?? d.tipo} ${d.numero ?? "s/n"} / ${d.troca ? formatarData(d.troca) : "-"} / ${d.proxima_troca ? formatarData(d.proxima_troca) : "-"}`)
        .join(" | ")],
    ["Próxima visita", (f) => (f.proxima_visita ? formatarData(f.proxima_visita) : "")],
  ];

  // Texto "+55…" e identificadores ficam como texto; evita o Excel interpretar células como fórmula.
  const celula = (v: string | null) => {
    let s = (v ?? "").replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s}"`;
  };
  const linhas = [colunas.map(([t]) => celula(t)).join(";"), ...fichas.map((f) => colunas.map(([, fn]) => celula(fn(f))).join(";"))];

  return new Response("﻿" + linhas.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pacientes-emad27.csv"',
      "Cache-Control": "no-store",
    },
  });
}
