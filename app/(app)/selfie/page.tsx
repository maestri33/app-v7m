import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { readSession } from "@/lib/auth/server";

import { SelfieForm } from "./SelfieForm";

export const dynamic = "force-dynamic";

export default async function SelfiePage() {
  const session = await readSession();
  if (!session) redirect("/entrar");
  if (!session.roles.includes("candidate")) redirect("/painel");

  return (
    <GrainSection className="bg-paper-soft min-h-[60vh]">
      <Container>
        <p className="kicker text-gold-ink">V7M · Promotor</p>
        <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
          Sua selfie
        </h1>
        <p className="text-muted-on-light mb-8">
          Foto ao vivo, sem óculos escuros. A IA confere a vivacidade e compara
          com o rosto do documento. Se reprovar, ela te explica como refazer.
        </p>
        <div className="max-w-xl">
          <SelfieForm />
        </div>
      </Container>
    </GrainSection>
  );
}
