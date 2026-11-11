import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { vencida } = await searchParams;
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold">Entrar al panel</h1>
        <p className="mb-8 text-zinc-600">
          {vencida ? "Tu sesión venció. Vuelve a entrar." : "Administra productos, diseño y datos de tu tienda."}
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
