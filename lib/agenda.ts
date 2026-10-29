// Agenda mensal automática de visitas domiciliares (cálculo puro: roda no servidor e no navegador).
//
// Regras:
// - Cada dia de atendimento recebe pacientes de um mesmo bairro; quando o bairro acaba, o dia é completado com o próximo.
// - Ninguém se repete dentro de um ciclo: só depois de todos os pacientes serem visitados a agenda recomeça (revisitas).
// - A meta do mês (ex.: 120 visitas) é distribuída por igual entre os dias de atendimento que faltam,
//   sem passar do máximo de visitas por dia.
// - É dinâmica: dias que já passaram mostram as visitas realmente registradas; quem já foi visitado no mês vai para o fim
//   da fila, e o restante da meta é redistribuído pelos próximos dias.
import { limitesDoMes } from "./opcoes";

export type PacienteAgenda = {
  id: number; nome: string; prontuario: string; bairro: string | null; rua: string | null; numero: string | null;
};
export type VisitaAgenda = { paciente_id: number; data: string };

export type ItemAgenda = { id: number; nome: string; prontuario: string; bairro: string; endereco: string; realizada: boolean };
export type DiaAgenda = {
  iso: string;
  /** 0 = domingo … 6 = sábado */
  dow: number;
  /** Dia da semana escolhido para atendimento. */
  util: boolean;
  /** Marcado como sem atendimento (feriado, folga, reunião). */
  folga: boolean;
  passado: boolean;
  itens: ItemAgenda[];
  bairros: string[];
};
export type OpcoesAgenda = { mes: string; hoje: string; meta: number; maxPorDia: number; diasSemana: number[]; folgas: string[] };
export type Agenda = {
  dias: DiaAgenda[];
  realizadas: number;
  previstas: number;
  /** Visitas que não cabem nos dias que restam (respeitando o máximo por dia) para chegar à meta. */
  faltamParaMeta: number;
  diasAtendimento: number;
  /** Dias de atendimento de hoje em diante (os que ainda recebem planejamento). */
  diasRestantes: number;
  pacientes: number;
};

export const SEM_BAIRRO = "Bairro não informado";

const chave = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function item(p: PacienteAgenda, bairro: string, realizada: boolean): ItemAgenda {
  const endereco = p.rua ? [p.rua, p.numero ? `nº ${p.numero}` : "s/n"].join(", ") : "";
  return { id: p.id, nome: p.nome, prontuario: p.prontuario, bairro, endereco, realizada };
}

export function gerarAgenda(pacientes: PacienteAgenda[], visitas: VisitaAgenda[], o: OpcoesAgenda): Agenda {
  const { inicio, fim } = limitesDoMes(o.mes);
  const porId = new Map(pacientes.map((p) => [p.id, p]));

  // Bairro de cada paciente, juntando grafias diferentes ("Bom Sucesso" / "bom sucesso").
  const nomeBairro = new Map<string, string>();
  const bairroDe = new Map<number, string>();
  for (const p of pacientes) {
    const b = p.bairro?.trim() ? p.bairro.trim().replace(/\s+/g, " ") : SEM_BAIRRO;
    const k = chave(b);
    if (!nomeBairro.has(k)) nomeBairro.set(k, b);
    bairroDe.set(p.id, nomeBairro.get(k)!);
  }

  // Última visita de cada paciente (para priorizar quem está há mais tempo sem visita).
  const ultima = new Map<number, string>();
  for (const v of visitas) if (v.data < o.hoje && v.data > (ultima.get(v.paciente_id) ?? "")) ultima.set(v.paciente_id, v.data);

  const doMes = visitas.filter((v) => v.data >= inicio && v.data < fim && v.data <= o.hoje && porId.has(v.paciente_id));
  const visitadosNoMes = new Set(doMes.map((v) => v.paciente_id));

  /** Fila de um ciclo: bairros em ordem alfabética; dentro do bairro, quem está há mais tempo sem visita primeiro. */
  const ordenar = (lista: PacienteAgenda[]) =>
    [...lista].sort((a, b) => {
      const ba = bairroDe.get(a.id)!, bb = bairroDe.get(b.id)!;
      if (ba !== bb) return ba === SEM_BAIRRO ? 1 : bb === SEM_BAIRRO ? -1 : ba.localeCompare(bb, "pt-BR");
      return (ultima.get(a.id) ?? "").localeCompare(ultima.get(b.id) ?? "") || a.nome.localeCompare(b.nome, "pt-BR");
    });

  // Dias do mês.
  const folgas = new Set(o.folgas);
  const dias: DiaAgenda[] = [];
  for (let t = Date.parse(`${inicio}T00:00:00Z`); t < Date.parse(`${fim}T00:00:00Z`); t += 86400000) {
    const d = new Date(t);
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    const realizadasDia = doMes.filter((v) => v.data === iso);
    dias.push({
      iso, dow, util: o.diasSemana.includes(dow), folga: folgas.has(iso), passado: iso < o.hoje,
      itens: realizadasDia.map((v) => item(porId.get(v.paciente_id)!, bairroDe.get(v.paciente_id)!, true)),
      bairros: [],
    });
  }

  // Quantas visitas planejar em cada dia de atendimento a partir de hoje.
  const aPlanejar = dias.filter((d) => d.util && !d.folga && !d.passado);
  const feitasHoje = dias.find((d) => d.iso === o.hoje && aPlanejar.includes(d))?.itens.length ?? 0;
  const restante = Math.max(0, o.meta - doMes.length) + feitasHoje;
  const base = aPlanejar.length ? Math.floor(restante / aPlanejar.length) : 0;
  const sobra = aPlanejar.length ? restante % aPlanejar.length : 0;

  let fila = ordenar(pacientes.filter((p) => !visitadosNoMes.has(p.id)));
  if (!fila.length) fila = ordenar(pacientes);

  aPlanejar.forEach((dia, i) => {
    const vagas = Math.max(0, Math.min(o.maxPorDia, base + (i < sobra ? 1 : 0)) - (dia.iso === o.hoje ? feitasHoje : 0));
    const noDia = new Set(dia.itens.map((x) => x.id));
    const adiados: PacienteAgenda[] = [];
    let novosCiclos = 0;
    let planejados = 0;
    while (planejados < vagas && pacientes.length) {
      if (!fila.length) {
        // Todos já entraram na agenda: começa um novo ciclo de revisitas.
        if (++novosCiclos > 1) break;
        const esperando = new Set(adiados.map((x) => x.id));
        fila = ordenar(pacientes.filter((x) => !esperando.has(x.id)));
      }
      const p = fila.shift()!;
      if (noDia.has(p.id)) {
        adiados.push(p);
        continue;
      }
      noDia.add(p.id);
      dia.itens.push(item(p, bairroDe.get(p.id)!, false));
      planejados++;
    }
    fila = [...adiados, ...fila];
  });

  for (const d of dias) d.bairros = [...new Set(d.itens.map((x) => x.bairro))];

  const previstas = dias.reduce((s, d) => s + d.itens.filter((x) => !x.realizada).length, 0);
  return {
    dias,
    realizadas: doMes.length,
    previstas,
    faltamParaMeta: Math.max(0, o.meta - doMes.length - previstas),
    diasAtendimento: dias.filter((d) => d.util && !d.folga).length,
    diasRestantes: aPlanejar.length,
    pacientes: pacientes.length,
  };
}
