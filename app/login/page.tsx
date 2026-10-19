import { FormularioLogin } from "./formulario";

export default function Login() {
  return (
    <main
      className="flex flex-1 items-center justify-center p-5"
      style={{
        background:
          "radial-gradient(circle at 15% 15%, rgba(22,115,209,0.25), transparent 45%), radial-gradient(circle at 85% 85%, rgba(11,31,68,0.2), transparent 45%), linear-gradient(160deg, #07142E 0%, #0B1F44 100%)",
      }}
    >
      <div className="w-full max-w-[420px] rounded-3xl border border-white/8 bg-[#151626]/85 p-9 text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="bg-brand-gradient mb-[22px] flex h-[68px] w-[68px] items-center justify-center rounded-[20px] shadow-[0_10px_28px_-6px_rgba(22,115,209,0.6)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-8 w-8">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <h1 className="text-[28px] font-bold tracking-tight">EMAD 27</h1>
        <p className="mb-7 mt-2 text-slate-400">Programa Melhor em Casa · acesso restrito à equipe</p>
        <FormularioLogin />
      </div>
    </main>
  );
}
