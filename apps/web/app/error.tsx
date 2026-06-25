"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Error Boundary global para o App Router.
 * Captura erros de renderização em qualquer página filha.
 */
export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[GlobalErrorBoundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="mb-2 text-xl font-bold text-gray-900">
          Algo deu errado
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Ocorreu um erro inesperado. Tente novamente ou volte para o início.
        </p>
        {error.digest && (
          <p className="mb-4 text-xs text-gray-400">
            Código: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}
