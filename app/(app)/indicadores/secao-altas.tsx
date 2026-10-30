"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { definirTipoAlta } from "../../actions";
import type { Alta } from "@/lib/indicadores";
import type { Comum } from "@/lib/indicadores-pdf";
import { ROTULO_OBITO, TIPOS_ALTA, rotuloTipoAlta } from "@/lib/indicadores-opcoes";
import { formatarData } from "@/lib/opcoes";
import { Aviso, BotaoPdf, Cabecalho, ColunaEmad, Moldura } from "./quadro";

const GRADE = "grid-cols-[5rem_minmax(0,1.1fr)_6rem_minmax(0,1.3fr)]";
const tipoDe = (a: Alta) => (a.situacao === "obito" ? ROTULO_OBITO : rotuloTipoAlta(a.tipo) ?? "");

export async function pdfAltas(lista: Alta[]) {
  return (await import("@/lib/indicadores-pdf")).quadroAltas(lista.map((a) => ({
    nome: a.nome, prontuario: a.prontuario, data: formatarData(a.data), tipo: tipoDe(a), motivo: a.motivo ?? "",
  })));
}

export function SecaoAltas({ lista, editar, comum }: { lista: Alta[]; editar: boolean; comum: Comum }) {
  const semTipo = lista.filter((a) => !tipoDe(a)).length;
  return (
    <Moldura
      id="altas" titulo="ALTAS"
      nota={<><strong>Tipos de alta:</strong> {[...TIPOS_ALTA.map((t) => t.rotulo), ROTULO_OBITO].join(" · ")}</>}
      acoes={
        <>
          <BotaoPdf
            comum={comum} rotulo="Baixar PDF de altas"
            quadro={() => pdfAltas(lista)}
          />
          {semTipo > 0 && <span className="text-sm font-semibold text-danger-strong">{semTipo} sem o tipo de alta.</span>}
        </>
      }
    >
      <Cabecalho cor="#adb9ca" grade={GRADE} colunas={["EMAD", "Paciente", "Data", "Motivo (tipo de alta)"]} />
      <div className="grid sm:grid-cols-[5rem_1fr]">
        <ColunaEmad cor="#c6e0b4" />
        {lista.length === 0 ? (
          <p className="m-0 px-4 py-6 text-center text-sm text-muted">Nenhuma alta em {comum.nomeMes.toLowerCase()}.</p>
        ) : (
          <ul className="m-0 grid list-none divide-y divide-border p-0">
            {lista.map((a) => <LinhaAlta key={a.id} a={a} editar={editar} />)}
          </ul>
        )}
      </div>
    </Moldura>
  );
}

function LinhaAlta({ a, editar }: { a: Alta; editar: boolean }) {
  const [tipo, setTipo] = useState(a.tipo ?? "");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  function mudar(v: string) {
    setTipo(v);
    setAviso(null);
    iniciar(async () => {
      const r = await definirTipoAlta(a.id, v);
      setAviso(r.erro ? { ok: false, texto: r.erro } : { ok: true, texto: "Salvo." });
    });
  }

  return (
    <li className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1.1fr)_6rem_minmax(0,1.3fr)] sm:items-start">
      <div className="min-w-0">
        <Link href={`/pacientes/${a.id}`} className="font-bold text-heading hover:underline">{a.nome}</Link>
        <p className="m-0 text-sm text-muted">Pront. {a.prontuario}</p>
      </div>
      <span className="text-sm sm:pt-1"><span className="text-muted sm:hidden">Data: </span>{formatarData(a.data)}</span>
      <div className="grid gap-1">
        {a.situacao === "obito" ? (
          <p className="m-0 font-semibold text-heading">{ROTULO_OBITO}</p>
        ) : editar ? (
          <select value={tipo} onChange={(e) => mudar(e.target.value)} disabled={pendente} aria-label={`Tipo de alta de ${a.nome}`} className="campo">
            <option value="">Escolha o tipo de alta…</option>
            {TIPOS_ALTA.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
          </select>
        ) : (
          <p className="m-0 font-semibold text-heading">{rotuloTipoAlta(a.tipo) ?? "Tipo de alta não informado"}</p>
        )}
        {a.motivo && <p className="m-0 text-sm text-muted">{a.motivo}</p>}
        <Aviso aviso={aviso} />
      </div>
    </li>
  );
}
