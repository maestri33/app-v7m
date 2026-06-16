/**
 * Configuração de ambiente (server-side).
 *
 * Lê do `.env.local` / process.env no boot do server. Não exposto ao client.
 * `BACKEND_URL` é o endereço público do Django em dev (porta 80 do host).
 */
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:80";

export const isProd = process.env.NODE_ENV === "production" && BACKEND_URL.startsWith("https://");
