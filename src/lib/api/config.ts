/**
 * Configuração de ambiente (server-side).
 *
 * Lê do `.env` / process.env no boot do server. Não exposto ao client.
 * `BACKEND_URL` = endereço do Django+Ninja:
 *   dev  → http://localhost:80 (default)
 *   prod → https://backend.v7m.live  (setado pelo runtime/CD, ver .env.example)
 */
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:80";

export const isProd = process.env.NODE_ENV === "production" && BACKEND_URL.startsWith("https://");
