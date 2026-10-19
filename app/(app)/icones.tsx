import type { ReactNode } from "react";

function Icone({ children, className = "h-5 w-5" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

export const IconeMais = (p: P) => <Icone {...p}><path d="M12 5v14M5 12h14" /></Icone>;
export const IconeCasa = (p: P) => <Icone {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></Icone>;
export const IconePessoas = (p: P) => (
  <Icone {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5.2a3.2 3.2 0 010 5.6M21 20c0-2.6-1.5-4.8-3.7-5.600" /></Icone>
);
export const IconePessoa = (p: P) => <Icone {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" /></Icone>;
export const IconeCalendario = (p: P) => <Icone {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Icone>;
export const IconeArquivo = (p: P) => <Icone {...p}><rect x="3" y="4" width="18" height="5" rx="1.5" /><path d="M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9M10 13h4" /></Icone>;
export const IconeCoracao = (p: P) => <Icone {...p}><path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0112 7.600 4.200 4.200 0 0119.500 10c0 5.400-7.500 10-7.500 10z" /><path d="M7 12h3l1.500-2.500 2 4L15 12h2" /></Icone>;
export const IconePrancheta = (p: P) => <Icone {...p}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /></Icone>;
export const IconeEscudo = (p: P) => <Icone {...p}><path d="M12 3l7.500 3v5.500c0 4.500-3 8-7.500 9.500-4.500-1.500-7.500-5-7.500-9.500V6z" /><path d="M9 12l2.200 2.200L15.500 10" /></Icone>;
export const IconeCadeado = (p: P) => <Icone {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></Icone>;
export const IconeBusca = (p: P) => <Icone {...p}><circle cx="11" cy="11" r="6.500" /><path d="M16 16l4 4" /></Icone>;
export const IconeFiltro = (p: P) => <Icone {...p}><path d="M4 7h16M7 12h10M10 17h4" /></Icone>;
export const IconeBaixar = (p: P) => <Icone {...p}><path d="M12 4v11M7.500 10.500L12 15l4.500-4.500M5 19h14" /></Icone>;
export const IconeSair = (p: P) => <Icone {...p}><path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M10 8l-4 4 4 4M6 12h10" /></Icone>;
export const IconeMenu = (p: P) => <Icone {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icone>;
export const IconeFechar = (p: P) => <Icone {...p}><path d="M6 6l12 12M18 6L6 18" /></Icone>;
export const IconeAjuda = (p: P) => <Icone {...p}><circle cx="12" cy="12" r="9" /><path d="M9.500 9.500a2.500 2.500 0 114 2c-.9.600-1.500 1-1.500 2M12 17h.01" /></Icone>;
export const IconeSeta = (p: P) => <Icone {...p}><path d="M9 6l6 6-6 6" /></Icone>;
