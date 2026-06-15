"use client";

/**
 * Erro fatal (renderização da root layout falhou).
 * Substitui TUDO — não tem o GrainSection do globals.css por garantia.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "4rem 1.5rem",
          maxWidth: "32rem",
          margin: "0 auto",
          color: "#0c0c0d",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
          Algo deu errado
        </h1>
        <p style={{ color: "#52525b", marginBottom: "1.5rem" }}>
          A gente já registrou. Tenta de novo — se persistir, recarregue a
          página e entre de novo na sua conta.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#0c0c0d",
            color: "#d4af37",
            border: 0,
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
