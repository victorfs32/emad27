import { rotuloStatus } from "@/lib/opcoes";

export function SeloStatus({ status }: { status: string }) {
  const s = rotuloStatus(status);
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cor}`}>
      {s.rotulo}
    </span>
  );
}
