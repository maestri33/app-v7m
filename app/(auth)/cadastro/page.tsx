import { PageHeader } from "@/components/ui/PageHeader";

import { CadastroForm } from "./CadastroForm";

export const metadata = { title: "Quero ser promotor" };

export default function CadastroPage() {
  return (
    <div>
      <PageHeader
        kicker=""
        tone="dark"
        title="Quero ser promotor"
        subtitle="Comece seu cadastro. Vamos te chamar no WhatsApp com o código de acesso."
      />
      <CadastroForm />
    </div>
  );
}
