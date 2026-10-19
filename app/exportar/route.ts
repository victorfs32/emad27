import { listarTodosParaExportar } from "@/lib/pacientes";
import { SEXOS, formatarData, rotuloStatus } from "@/lib/opcoes";

// Exporta todos os pacientes em CSV (separador ";" e BOM para abrir certo no Excel brasileiro).
// listarTodosParaExportar() exige sessão válida; sem login, redireciona para /login.
export async function GET() {
  const pacientes = await listarTodosParaExportar();

  const colunas: [string, (p: (typeof pacientes)[number]) => string | null][] = [
    ["Nome", (p) => p.nome],
    ["Situação", (p) => rotuloStatus(p.status).rotulo],
    ["Nascimento", (p) => formatarData(p.data_nascimento)],
    ["Sexo", (p) => SEXOS.find((s) => s.valor === p.sexo)?.rotulo ?? ""],
    ["CPF", (p) => p.cpf],
    ["CNS", (p) => p.cns],
    ["Telefone", (p) => p.telefone],
    ["Cuidador", (p) => p.contato_nome],
    ["Telefone do cuidador", (p) => p.contato_telefone],
    ["Endereço", (p) => p.endereco],
    ["Bairro", (p) => p.bairro],
    ["Município", (p) => p.municipio],
    ["Diagnóstico", (p) => p.diagnostico],
    ["CID", (p) => p.cid],
    ["Modalidade", (p) => p.modalidade],
    ["Admissão", (p) => formatarData(p.data_admissao)],
    ["LPP", (p) => (p.possui_lpp ? "Sim" : "Não")],
    ["Próxima visita", (p) => formatarData(p.proxima_visita)],
    ["Dispositivos", (p) => p.dispositivos],
  ];

  // Evita que o Excel interprete células como fórmula (=, +, -, @).
  const celula = (v: string | null) => {
    let s = (v ?? "").replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s}"`;
  };

  const linhas = [
    colunas.map(([t]) => celula(t)).join(";"),
    ...pacientes.map((p) => colunas.map(([, f]) => celula(f(p))).join(";")),
  ];

  return new Response("﻿" + linhas.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pacientes-emad27.csv"',
      "Cache-Control": "no-store",
    },
  });
}
