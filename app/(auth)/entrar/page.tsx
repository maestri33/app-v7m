import { PageHeader } from "@/components/ui/PageHeader";

import { EntrarForm } from "./EntrarForm";

export const metadata = { title: "Entrar" };

export default function EntrarPage() {
  return (
    <div>
      <PageHeader
        kicker=""
        tone="dark"
        title="Entrar"
        subtitle="Confirme seu cadastro e entre com o código que mandamos no WhatsApp."
      />
      <EntrarForm />
    </div>
  );
}
