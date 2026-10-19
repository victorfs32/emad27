import { FormularioLogin } from "./formulario";

export default function Login() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Melhor em Casa</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">EMAD 27</h1>
          <p className="mt-2 text-sm text-slate-600">Acesso restrito aos profissionais da equipe.</p>
        </div>
        <FormularioLogin />
      </div>
    </main>
  );
}
