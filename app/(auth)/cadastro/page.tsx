import { CadastroForm } from "./CadastroForm";

export const metadata = { title: "Quero ser promotor · V7M" };

export default function CadastroPage() {
  return (
    <div>
      <h1
        className="text-paper mb-3"
        style={{ fontSize: "var(--text-h2-sm)" }}
      >
        Quero ser promotor
      </h1>
      <p className="text-muted-on-dark mb-8">
        Comece seu cadastro. Vamos te chamar no WhatsApp com o código de acesso.
      </p>
      <CadastroForm />
    </div>
  );
}
