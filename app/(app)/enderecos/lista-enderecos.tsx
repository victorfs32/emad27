"use client";

import { useEffect, useMemo, useState } from "react";
import type { Endereco } from "@/lib/pacientes";
import { formatarCep, formatarTelefone, soDigitos } from "@/lib/validacao";
import { IconeBaixar, IconeBusca, IconeFechar, IconeMapa, IconeTelefone } from "../icones";

const DE_QUEM: Record<string, string> = { paciente: "Paciente", cuidador: "Cuidador", familiar: "Familiar" };

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Logradouro, número e complemento numa linha. */
const linhaRua = (p: Endereco) => [p.rua, p.numero ? `nº ${p.numero}` : "s/n", p.complemento].filter(Boolean).join(", ");

/** Endereço completo, usado para abrir o mapa e para copiar. */
function enderecoCompleto(p: Endereco) {
  const local = [p.bairro, p.municipio || "Fortaleza"].filter(Boolean).join(", ");
  return [p.rua ? linhaRua(p) : "", local, p.cep ? `CEP ${formatarCep(p.cep)}` : ""].filter(Boolean).join(" - ");
}

const linkMapa = (endereco: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;

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

const agora = () => new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export function ListaEnderecos({ pacientes }: { pacientes: Endereco[] }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Endereco | null>(null);
  const [marcados, setMarcados] = useState<Set<number>>(() => new Set());
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  const filtrados = useMemo(() => {
    const t = semAcento(busca.trim());
    if (!t) return pacientes;
    return pacientes.filter((p) => semAcento(`${p.nome} ${p.prontuario} ${p.bairro ?? ""} ${p.rua ?? ""}`).includes(t));
  }, [busca, pacientes]);

  const todosMarcados = filtrados.length > 0 && filtrados.every((p) => marcados.has(p.id));
  const marcar = (id: number) =>
    setMarcados((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const marcarTodos = () =>
    setMarcados((m) => {
      const n = new Set(m);
      for (const p of filtrados) {
        if (todosMarcados) n.delete(p.id);
        else n.add(p.id);
      }
      return n;
    });

  /** Um PDF só, em paisagem, com os pacientes marcados, agrupados por bairro para facilitar o roteiro. */
  async function imprimirMarcados() {
    setErro("");
    setGerando(true);
    try {
      const escolhidos = pacientes
        .filter((p) => marcados.has(p.id))
        .sort((a, b) => (a.bairro ?? "").localeCompare(b.bairro ?? "", "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"));
      const { gerarListaEnderecosPdf } = await import("@/lib/enderecos-lista-pdf");
      await gerarListaEnderecosPdf(
        escolhidos.map((p) => ({
          nome: p.nome,
          prontuario: p.prontuario,
          internado: p.situacao === "internado",
          rua: p.rua ? linhaRua(p) : "",
          bairro: p.bairro ?? "",
          cidade: [p.municipio, p.cep ? `CEP ${formatarCep(p.cep)}` : ""].filter(Boolean).join(" - "),
          referencia: p.referencia ?? "",
          telefones: contatos(p).map((f) => `${formatarTelefone(f.numero)} (${f.quem}${f.whatsapp ? ", WhatsApp" : ""})`),
        })),
        agora(),
      );
    } catch (e) {
      console.error(e);
      setErro("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

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

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-heading">
          <input type="checkbox" checked={todosMarcados} onChange={marcarTodos} disabled={filtrados.length === 0} className="h-5 w-5 accent-accent" />
          Selecionar todos{busca.trim() ? " da busca" : ""}
        </label>
        <button type="button" onClick={imprimirMarcados} disabled={marcados.size === 0 || gerando} className="btn-primario">
          <IconeBaixar /> {gerando ? "Gerando PDF…" : `Imprimir selecionados (${marcados.size})`}
        </button>
        {marcados.size > 0 && (
          <button type="button" onClick={() => setMarcados(new Set())} className="text-sm font-semibold text-muted underline">
            Limpar seleção
          </button>
        )}
      </div>
      {erro && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erro}</p>}

      {filtrados.length === 0 ? (
        <p className="cartao m-0 text-center text-sm text-muted">Nenhum paciente encontrado.</p>
      ) : (
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {filtrados.map((p) => (
            <li key={p.id} className="flex items-stretch gap-2">
              <label className="flex w-12 flex-none cursor-pointer items-center justify-center rounded-[18px] border border-border bg-surface shadow-card">
                <input
                  type="checkbox"
                  checked={marcados.has(p.id)}
                  onChange={() => marcar(p.id)}
                  aria-label={`Selecionar ${p.nome}`}
                  className="h-5 w-5 accent-accent"
                />
              </label>
              <button
                type="button"
                onClick={() => setAberto(p)}
                className="flex min-w-0 flex-1 items-center gap-4 rounded-[22px] border border-border bg-surface px-5 py-4 text-left shadow-card transition hover:border-accent-soft-strong"
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
  const [gerando, setGerando] = useState(false);
  const [erroPdf, setErroPdf] = useState("");
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

  async function imprimir() {
    setErroPdf("");
    setGerando(true);
    try {
      const { gerarEnderecoPdf } = await import("@/lib/endereco-pdf");
      await gerarEnderecoPdf({
        nome: p.nome,
        prontuario: p.prontuario,
        rua: p.rua ? linhaRua(p) : "",
        local: [p.bairro, p.municipio].filter(Boolean).join(" - "),
        cep: p.cep ? formatarCep(p.cep) : "",
        referencia: p.referencia ?? "",
        contatos: fones.map((f) => ({ numero: formatarTelefone(f.numero), quem: f.quem, whatsapp: f.whatsapp })),
        mapa: temEndereco ? linkMapa(endereco) : "",
        geradoEm: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }),
      });
    } catch (e) {
      console.error(e);
      setErroPdf("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGerando(false);
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
              href={linkMapa(endereco)}
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

        <button type="button" onClick={imprimir} disabled={gerando} className="btn-secundario">
          <IconeBaixar /> {gerando ? "Gerando PDF…" : "Imprimir PDF do endereço"}
        </button>
        {erroPdf && <p role="alert" className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-strong">{erroPdf}</p>}
      </div>
    </div>
  );
}
