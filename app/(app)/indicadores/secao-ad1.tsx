"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { definirMotivoPermanencia } from "../../actions";
import type { PacienteAd1 } from "@/lib/indicadores";
import type { Comum } from "@/lib/indicadores-pdf";
import { EXEMPLOS_PERMANENCIA } from "@/lib/indicadores-opcoes";
import { Aviso, BotaoPdf, Cabecalho, ColunaEmad, Moldura } from "./quadro";

const GRADE = "grid-cols-[5rem_minmax(0,1fr)_4rem_minmax(0,1.4fr)]";

export async function pdfAd1(lista: PacienteAd1[]) {
  return (await import("@/lib/indicadores-pdf")).quadroAd1(lista.map((p) => ({ nome: p.nome, prontuario: p.prontuario, motivo: p.motivo ?? p.sugestao })));
}

export function SecaoAd1({ lista, editar, comum }: { lista: PacienteAd1[]; editar: boolean; comum: Comum }) {
  const semMotivo = lista.filter((p) => !p.motivo && !p.sugestao).length;
  return (
    <Moldura
      id="ad1" titulo="ACOMPANHAMENTO DE PACIENTES AD1"
      nota={<><strong>Exemplos de motivo da permanência:</strong> {EXEMPLOS_PERMANENCIA.join(" · ")}</>}
      acoes={
        <>
          <BotaoPdf
            comum={comum} rotulo="Baixar PDF de acompanhamento AD1"
            quadro={() => pdfAd1(lista)}
          />
          {semMotivo > 0 && <span className="text-sm font-semibold text-danger-strong">{semMotivo} sem motivo de permanência.</span>}
        </>
      }
    >
      <Cabecalho cor="#a6a6a6" grade={GRADE} colunas={["EMAD", "Nome do paciente", "AD1", "Motivo da permanência do paciente no Programa"]} />
      <div className="grid sm:grid-cols-[5rem_1fr]">
        <ColunaEmad cor="#d9d9d9" />
        {lista.length === 0 ? (
          <p className="m-0 px-4 py-6 text-center text-sm text-muted">Nenhum paciente AD1 em acompanhamento.</p>
        ) : (
          <ul className="m-0 grid list-none divide-y divide-border p-0">
            {lista.map((p) => <LinhaAd1 key={p.id} p={p} editar={editar} />)}
          </ul>
        )}
      </div>
    </Moldura>
  );
}

function LinhaAd1({ p, editar }: { p: PacienteAd1; editar: boolean }) {
  const salvo = p.motivo ?? "";
  // Sem motivo salvo, o campo já vem com a sugestão tirada do cadastro (dispositivos, lesão, cama/oxigênio do Programa).
  const [texto, setTexto] = useState(salvo || p.sugestao);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const mudou = texto.trim() !== salvo;

  function salvar() {
    setAviso(null);
    iniciar(async () => {
      const r = await definirMotivoPermanencia(p.id, texto);
      setAviso(r.erro ? { ok: false, texto: r.erro } : { ok: true, texto: "Salvo." });
    });
  }

  return (
    <li className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_4rem_minmax(0,1.4fr)] sm:items-start">
      <div className="min-w-0">
        <Link href={`/pacientes/${p.id}`} className="font-bold text-heading hover:underline">{p.nome}</Link>
        <p className="m-0 text-sm text-muted">Pront. {p.prontuario}</p>
      </div>
      <span className="text-sm font-semibold text-heading sm:pt-1 sm:text-center">AD1</span>
      <div className="grid gap-2">
        <textarea
          value={texto} onChange={(e) => setTexto(e.target.value)} readOnly={!editar} rows={2} maxLength={300}
          placeholder="Motivo da permanência no Programa" aria-label={`Motivo da permanência de ${p.nome}`} className="campo"
        />
        {!salvo && p.sugestao && texto === p.sugestao && (
          <p className="m-0 text-xs text-muted">Sugestão tirada do cadastro. Confira e salve.</p>
        )}
        {editar && (mudou || aviso) && (
          <div className="flex items-center gap-3">
            {mudou && (
              <button type="button" onClick={salvar} disabled={pendente} className="btn-primario min-h-10 px-4 text-sm">
                {pendente ? "Salvando…" : "Salvar"}
              </button>
            )}
            <Aviso aviso={aviso} />
          </div>
        )}
      </div>
    </li>
  );
}
