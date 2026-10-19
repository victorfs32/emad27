"use client";

import { usePathname } from "next/navigation";
import { IconeCadeado } from "./icones";

const TITULOS: Record<string, string> = {
  "/": "Pacientes",
  "/proximas-visitas": "Próximas visitas",
  "/arquivados": "Arquivados",
  "/dispositivos": "Dispositivos",
  "/lesoes": "Lesões",
  "/visitas": "Controle de visitas",
  "/procedimentos": "Procedimentos",
  "/pacientes/novo": "Novo paciente",
  "/equipe": "Equipe e permissões",
};

export function Migalhas() {
  const rota = usePathname();
  const titulo = TITULOS[rota] ?? (rota.startsWith("/pacientes/") ? "Ficha do paciente" : "");
  return (
    <div className="hidden items-center justify-between px-8 pt-6 lg:flex">
      <p className="text-[12.5px] font-semibold text-muted">
        Área de trabalho <span className="mx-1.5 text-border">›</span>
        <span className="text-heading">{titulo}</span>
      </p>
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <IconeCadeado className="h-4 w-4" /> Acesso privado
      </span>
    </div>
  );
}
