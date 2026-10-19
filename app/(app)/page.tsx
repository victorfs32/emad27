import Link from "next/link";
import { contarPorStatus, listarPacientes } from "@/lib/pacientes";
import { STATUS, calcularIdade, formatarData } from "@/lib/opcoes";
import { SeloStatus } from "./selo-status";

export default async function Listagem({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const statusParam = typeof sp.status === "string" ? sp.status : "";
  const status = STATUS.some((s) => s.valor === statusParam) ? statusParam : "";

  const [pacientes, contagem] = await Promise.all([listarPacientes(q, status), contarPorStatus()]);
  const total = Object.values(contagem).reduce((a, b) => a + b, 0);

  const href = (st: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (st) p.set("status", st);
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pacientes</h1>
        <Link href="/pacientes/novo" className="btn-primario">+ Novo paciente</Link>
      </div>

      <form className="flex gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome, CPF, CNS, bairro ou diagnóstico"
          className="campo"
          aria-label="Buscar pacientes"
        />
        {status && <input type="hidden" name="status" value={status} />}
        <button className="btn-secundario">Buscar</button>
      </form>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filtrar por situação">
        {[{ valor: "", rotulo: "Todos" }, ...STATUS].map((s) => {
          const ativo = s.valor === status;
          const n = s.valor ? (contagem[s.valor] ?? 0) : total;
          return (
            <Link
              key={s.valor}
              href={href(s.valor)}
              aria-current={ativo ? "page" : undefined}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${
                ativo ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {s.rotulo} <span className="opacity-75">({n})</span>
            </Link>
          );
        })}
      </nav>

      {pacientes.length === 0 ? (
        <p className="cartao text-center text-slate-600">
          {total === 0 ? "Nenhum paciente cadastrado ainda." : "Nenhum paciente encontrado com esses filtros."}
        </p>
      ) : (
        <>
          {/* Celular: cartões */}
          <ul className="space-y-2 md:hidden">
            {pacientes.map((p) => (
              <li key={p.id}>
                <Link href={`/pacientes/${p.id}`} className="cartao block active:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{p.nome}</span>
                    <SeloStatus status={p.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {[calcularIdade(p.data_nascimento) !== null && `${calcularIdade(p.data_nascimento)} anos`, p.bairro, p.modalidade]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  {p.diagnostico && <p className="mt-1 text-sm text-slate-700">{p.diagnostico}</p>}
                  <p className="mt-1 text-xs text-slate-500">Última evolução: {formatarData(p.ultima_evolucao)}</p>
                </Link>
              </li>
            ))}
          </ul>

          {/* Computador: tabela */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Idade</th>
                  <th className="px-4 py-3">Bairro</th>
                  <th className="px-4 py-3">Diagnóstico</th>
                  <th className="px-4 py-3">Mod.</th>
                  <th className="px-4 py-3">Situação</th>
                  <th className="px-4 py-3">Últ. evolução</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pacientes.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/pacientes/${p.id}`} className="text-teal-800 hover:underline">{p.nome}</Link>
                    </td>
                    <td className="px-4 py-3">{calcularIdade(p.data_nascimento) ?? "—"}</td>
                    <td className="px-4 py-3">{p.bairro || "—"}</td>
                    <td className="px-4 py-3">{p.diagnostico || "—"}</td>
                    <td className="px-4 py-3">{p.modalidade || "—"}</td>
                    <td className="px-4 py-3"><SeloStatus status={p.status} /></td>
                    <td className="px-4 py-3">{formatarData(p.ultima_evolucao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
