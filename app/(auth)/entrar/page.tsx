import { EntrarForm } from "./EntrarForm";

export const metadata = { title: "Entrar · Promotor V7M" };

export default function EntrarPage() {
  return (
    <div>
      <h1
        className="text-paper mb-3"
        style={{ fontSize: "var(--text-h2-sm)" }}
      >
        Entrar
      </h1>
      <p className="text-muted-on-dark mb-8">
        Confirme seu cadastro e entre com o código que mandamos no WhatsApp.
      </p>
      <EntrarForm />
    </div>
  );
}
