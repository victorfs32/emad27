import { rotuloStatus } from "@/lib/opcoes";

const CORES: Record<string, string> = {
  ativo: "bg-success-soft text-success-strong",
  internado: "bg-warning-soft text-warning-strong",
  suspenso: "bg-secondary text-muted",
  alta: "bg-info-soft text-info-strong",
  obito: "bg-danger-soft text-danger-strong",
};

export function SeloStatus({ status }: { status: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${CORES[status] ?? CORES.ativo}`}
    >
      {rotuloStatus(status).rotulo}
    </span>
  );
}
