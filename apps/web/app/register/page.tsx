"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpBusinessOwner } from "../actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    const slug = (formData.get("tenantSlug") as string)
      .toLowerCase()
      .replace(/\s+/g, "-");

    const result = await signUpBusinessOwner({
      email: formData.get("email") as string,
      password,
      fullName: formData.get("fullName") as string,
      tenantName: formData.get("tenantName") as string,
      tenantSlug: slug,
      phone: formData.get("phone") as string,
    });

    if (!result.ok) {
      setError(result.error?.message ?? "Erro ao cadastrar");
      setLoading(false);
      return;
    }

    router.push("/login?registered=true");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">GoDelivery</h1>
          <p className="mt-2 text-gray-600">Crie sua conta de empresário</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl bg-white p-6 shadow"
          aria-label="Formulário de cadastro"
        >
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700"
            >
              Nome completo
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              aria-required="true"
              aria-invalid={!!error}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              aria-required="true"
              aria-invalid={!!error}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Telefone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              aria-required="true"
              aria-invalid={!!error}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="tenantName"
              className="block text-sm font-medium text-gray-700"
            >
              Nome do estabelecimento
            </label>
            <input
              id="tenantName"
              name="tenantName"
              type="text"
              required
              aria-required="true"
              aria-invalid={!!error}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="tenantSlug"
              className="block text-sm font-medium text-gray-700"
            >
              Identificador (slug)
            </label>
            <input
              id="tenantSlug"
              name="tenantSlug"
              type="text"
              required
              aria-required="true"
              aria-invalid={!!error}
              pattern="[a-z0-9-]+"
              title="Apenas letras minúsculas, números e hífen"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="mt-1 text-xs text-gray-500">Ex: minha-empresa</p>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              aria-required="true"
              aria-invalid={!!error}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="confirm_password"
              className="block text-sm font-medium text-gray-700"
            >
              Confirme a senha
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={6}
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby="password-error"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {error && (
            <div id="password-error" role="alert" aria-live="assertive" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Cadastrando..." : "Criar conta"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Já tem conta?{" "}
          <a
            href="/login"
            className="font-medium text-blue-600 hover:underline"
          >
            Entre aqui
          </a>
        </p>
      </div>
    </div>
  );
}
