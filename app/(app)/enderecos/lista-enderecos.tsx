"use client";

import { useEffect, useMemo, useState } from "react";
import type { Endereco } from "@/lib/pacientes";
import { formatarCep, formatarTelefone, soDigitos } from "@/lib/validacao";
import { IconeBusca, IconeFechar, IconeMapa, IconeTelefone } from "../icones";

const DE_QUEM: Record<string, string> = { paciente: "Paciente", cuidador: "Cuidador", familiar: "Familiar" };

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Logradouro, número e complemento numa linha. */
const linhaRua = (p: Endereco) => [p.rua, p.numero ? `nº ${p.numero}` : "s/n", p.complemento].filter(Boolean).join(", ");

/** Endereço completo, usado para abrir o mapa e para copiar. */
function enderecoCompleto(p: Endereco) {
  const local = [p.bairro, p.municipio || "Fortaleza"].filter(Boolean).join(", ");
  return [p.rua ? linhaRua(p) : "", local, p.cep ? `CEP ${formatarCep(p.cep)}` : ""].filter(Boolean).join(" - ");
}

/** Telefones do paciente e dos cuidadores, sem repetir número. */
function contatos(p: Endereco) {
  const lista: { numero: string; quem: string; whatsapp: boolean }[] = [];
  const visto = new Set<string>();
  const incluir = (numero: string | null, quem: string, whatsapp: boolean) => {
    const n = soDigitos(numero ?? "");
    if (!n || visto.has(n)) return;
    visto.add(n);
    lista.push({ numero: n, quem, whatsapp });
  };
  for (const t of p.telefones) incluir(t.numero, DE_QUEM[t.de_quem] ?? t.de_quem, t.whatsapp === true);
  for (const c of [...p.cuidadores].sort((a, b) => Number(b.principal) - Number(a.principal))) {
    incluir(c.telefone, `Cuidador: ${c.nome}${c.vinculo ? ` (${c.vinculo})` : ""}`, false);
  }
  return lista;
}

export function ListaEnderecos({ pacientes }: { pacientes: Endereco[] }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Endereco | null>(null);

  const filtrados = useMemo(() => {
    const t = semAcento(busca.trim());
    if (!t) return pacientes;
    return pacientes.filter((p) => semAcento(`${p.nome} ${p.prontuario} ${p.bairro ?? ""} ${p.rua ?? ""}`).includes(t));
  }, [busca, pacientes]);

  return (
    <>
      <div className="relative">
        <IconeBusca className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          type="search"
          placeholder="Buscar por nome, prontuário, bairro ou rua…"
          aria-label="Buscar paciente"
          className="campo pl-11"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="cartao m-0 text-center text-sm text-muted">Nenhum paciente encontrado.</p>
      ) : (
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {filtrados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setAberto(p)}
                className="flex w-full items-center gap-4 rounded-[22px] border border-border bg-surface px-5 py-4 text-left shadow-card transition hover:border-accent-soft-strong"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <IconeMapa />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-heading">{p.nome}</strong>
                  <small className="block truncate text-muted">
                    {[p.bairro, p.rua ? linhaRua(p) : "Endereço não informado"].filter(Boolean).join(" · ")}
                  </small>
                </span>
                {p.situacao === "internado" && (
                  <span className="flex-none rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger-strong">Internado</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {aberto && <JanelaEndereco p={aberto} fechar={() => setAberto(null)} />}
    </>
  );
}

function JanelaEndereco({ p, fechar }: { p: Endereco; fechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const endereco = enderecoCompleto(p);
  const fones = contatos(p);
  const temEndereco = Boolean(p.rua || p.bairro || p.cep);

  // Esc fecha; a página de trás não rola enquanto a janela está aberta.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    document.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [fechar]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText([p.nome, endereco, p.referencia ? `Referência: ${p.referencia}` : ""].filter(Boolean).join("\n"));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4" onClick={fechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="endereco-titulo"
        onClick={(e) => e.stopPropagation()}
        className="grid max-h-[92vh] w-full gap-5 overflow-y-auto rounded-t-[26px] bg-surface p-5 shadow-card-md sm:max-w-lg sm:rounded-[26px] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Pront. {p.prontuario}</p>
            <h2 id="endereco-titulo" className="m-0 mt-1 text-xl font-extrabold text-heading">{p.nome}</h2>
          </div>
          <button type="button" onClick={fechar} aria-label="Fechar" className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-border text-heading">
            <IconeFechar />
          </button>
        </div>

        <section className="grid gap-1.5 rounded-2xl bg-detail p-4">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-muted">Endereço</p>
          {temEndereco ? (
            <>
              <p className="m-0 text-lg font-bold leading-snug text-heading">{p.rua ? linhaRua(p) : "Rua não informada"}</p>
              <p className="m-0 text-[15px] text-heading">{[p.bairro, p.municipio].filter(Boolean).join(" - ") || "Bairro não informado"}</p>
              {p.cep && <p className="m-0 text-sm text-muted">CEP {formatarCep(p.cep)}</p>}
            </>
          ) : (
            <p className="m-0 text-[15px] text-muted">Endereço não informado no cadastro.</p>
          )}
          {p.referencia && (
            <p className="m-0 mt-2 text-[15px] text-heading"><strong>Referência:</strong> {p.referencia}</p>
          )}
        </section>

        {temEndereco && (
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primario"
            >
              <IconeMapa /> Abrir no mapa
            </a>
            <button type="button" onClick={copiar} className="btn-secundario">
              {copiado ? "Endereço copiado" : "Copiar endereço"}
            </button>
          </div>
        )}

        <section className="grid gap-2">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-muted">Telefones de contato</p>
          {fones.length === 0 ? (
            <p className="m-0 text-[15px] text-muted">Nenhum telefone no cadastro.</p>
          ) : (
            fones.map((f) => (
              <div key={f.numero} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                <span className="min-w-0 flex-1">
                  <strong className="block text-lg text-heading">{formatarTelefone(f.numero)}</strong>
                  <small className="block truncate text-muted">{f.quem}</small>
                </span>
                {f.whatsapp && (
                  <a
                    href={`https://wa.me/55${f.numero}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center rounded-xl border border-border px-3 text-sm font-semibold text-heading"
                  >
                    WhatsApp
                  </a>
                )}
                <a href={`tel:${f.numero}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-bold text-white">
                  <IconeTelefone className="h-4 w-4" /> Ligar
                </a>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
