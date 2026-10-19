import { SITUACOES } from "@/lib/opcoes";

const CORES: Record<string, string> = {
  ativo: "bg-success-soft text-success-strong",
  internado: "bg-warning-soft text-warning-strong",
  alta: "bg-info-soft text-info-strong",
  transferido: "bg-secondary text-muted",
  obito: "bg-danger-soft text-danger-strong",
};

export function SeloStatus({ status }: { status: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${CORES[status] ?? CORES.ativo}`}>
      {SITUACOES.find((s) => s.valor === status)?.rotulo ?? status}
    </span>
  );
}
