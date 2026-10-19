import Link from "next/link";
import { connection } from "next/server";
import { listarDispositivos, TIPOS_DISPOSITIVO, type PacienteDispositivos } from "@/lib/pacientes";
import { DIURESE, VIAS_DIETA, VIAS_SONDA, formatarData, hojeISO, rotulo } from "@/lib/opcoes";
import { IconeDispositivo } from "../icones";

function diasDesde(iso: string, hoje: string) {
  return Math.floor((Date.parse(hoje) - Date.parse(iso)) / 86400000);
}

function Linhas({ p, hoje }: { p: PacienteDispositivos; hoje: string }) {
  const itens: { titulo: string; detalhe: string; alerta?: string }[] = [];
  if (p.tqt) {
    const troca = p.tqt_ultima_troca;
    const dias = troca ? diasDesde(troca, hoje) : null;
    itens.push({
      titulo: "Traqueostomia",
      detalhe: [
        p.tqt_canula_tipo && `cânula ${p.tqt_canula_tipo}`,
        p.tqt_calibre && `nº ${p.tqt_calibre}`,
        `última troca: ${troca ? formatarData(troca) : "não informada"}`,
      ].filter(Boolean).join(" · "),
      alerta: dias !== null && dias > 30 ? `troca há ${dias} dias` : undefined,
    });
  }
  if (p.o2) {
    itens.push({
      titulo: "Oxigênio",
      detalhe: [p.o2_dispositivo, p.o2_fluxo !== null && `${p.o2_fluxo} L/min`, p.o2_regime].filter(Boolean).join(" · ") || "sem detalhes",
    });
  }
  const sondas = p.dieta_vias.filter((v) => (VIAS_SONDA as readonly string[]).includes(v));
  if (sondas.length) itens.push({ titulo: "Alimentação por sonda", detalhe: sondas.map((v) => rotulo(VIAS_DIETA, v)).join(", ") });
  if (p.diurese === "svd" || p.diurese === "cistostomia") itens.push({ titulo: "Eliminação urinária", detalhe: rotulo(DIURESE, p.diurese) ?? "" });

  return (
    <ul className="m-0 mt-3 grid list-none gap-2 p-0">
      {itens.map((i) => (
        <li key={i.titulo} className="flex flex-wrap items-baseline gap-x-2 rounded-xl bg-detail px-3 py-2 text-sm">
          <strong className="text-heading">{i.titulo}</strong>
          <span className="text-muted">{i.detalhe}</span>
          {i.alerta && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-bold text-warning-strong">{i.alerta}</span>}
        </li>
      ))}
    </ul>
  );
}

export default async function Dispositivos({ searchParams }: PageProps<"/dispositivos">) {
  await connection();
  const sp = await searchParams;
  const tipo = typeof sp.tipo === "string" ? sp.tipo : "";
  const pacientes = await listarDispositivos(tipo);
  const hoje = hojeISO();

  return (
    <div className="grid gap-6">
      <header>
        <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">Cuidados especiais</p>
        <h1 className="m-0 mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-heading">Dispositivos<span className="text-accent">.</span></h1>
        <p className="m-0 mt-1 text-sm text-muted">Pacientes em acompanhamento que usam traqueostomia, oxigênio, sonda ou cateter urinário.</p>
      </header>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0" aria-label="Tipo de dispositivo">
        {[{ valor: "", rotulo: "Todos" }, ...TIPOS_DISPOSITIVO].map((t) => (
          <Link
            key={t.valor}
            href={t.valor ? `/dispositivos?tipo=${t.valor}` : "/dispositivos"}
            aria-current={t.valor === tipo ? "page" : undefined}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${t.valor === tipo ? "border-accent bg-accent text-white" : "border-border bg-surface text-muted hover:text-heading"}`}
          >
            {t.rotulo}
          </Link>
        ))}
      </nav>

      {pacientes.length === 0 ? (
        <div className="rounded-[22px] border border-border bg-surface px-5 py-12 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><IconeDispositivo className="h-7 w-7" /></span>
          <p className="mb-0 mt-3 font-bold text-heading">Nenhum paciente com este dispositivo</p>
          <p className="mb-0 mt-1 text-sm text-muted">Os dados vêm do bloco “Informações clínicas” do cadastro.</p>
        </div>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 lg:grid-cols-2">
          {pacientes.map((p) => (
            <li key={p.id} className="cartao">
              <Link href={`/pacientes/${p.id}?aba=clinico`} className="block">
                <strong className="text-heading hover:text-accent">{p.nome}</strong>
                <p className="m-0 mt-0.5 text-sm text-muted">
                  Pront. {p.prontuario}{[p.uaps?.nome, p.bairro].filter(Boolean).map((x) => ` · ${x}`).join("")}
                </p>
              </Link>
              <Linhas p={p} hoje={hoje} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
