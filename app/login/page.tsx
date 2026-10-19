import { FormularioLogin } from "./formulario";

export default function Login() {
  return (
    <main
      className="flex flex-1 items-center justify-center p-5"
      style={{
        background:
          "radial-gradient(circle at 15% 15%, rgba(29,111,87,0.16), transparent 45%), radial-gradient(circle at 85% 85%, rgba(20,80,63,0.12), transparent 45%), #f1f5f1",
      }}
    >
      <div className="w-full max-w-[420px] rounded-3xl border border-border bg-surface p-9 text-heading shadow-card-lg">
        <div className="mb-[22px] flex h-[68px] w-[68px] items-center justify-center rounded-[20px] bg-accent text-white shadow-card-md">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-8 w-8">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <h1 className="text-[28px] font-bold tracking-tight">EMAD 27</h1>
        <p className="mb-7 mt-2 text-muted">Programa Melhor em Casa · acesso restrito à equipe</p>
        <FormularioLogin />
      </div>
    </main>
  );
}
