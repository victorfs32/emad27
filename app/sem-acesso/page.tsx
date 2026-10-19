import { sair } from "../actions";

export default function SemAcesso() {
  return (
    <main className="flex flex-1 items-center justify-center p-5">
      <div className="w-full max-w-[420px] rounded-3xl border border-border bg-surface p-9 text-center shadow-card-lg">
        <h1 className="m-0 text-2xl font-extrabold text-heading">Acesso desativado</h1>
        <p className="mb-6 mt-3 text-muted">
          Seu usuário não tem acesso ativo ao sistema. Fale com a coordenação da EMAD 27 para liberar.
        </p>
        <form action={sair}><button className="btn-primario w-full">Sair</button></form>
      </div>
    </main>
  );
}
