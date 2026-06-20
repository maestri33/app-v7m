import type { ReactNode } from "react";
import Link from "next/link";
import { GrainSection } from "@/components/layout/GrainSection";
import { Container } from "@/components/layout/Container";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <GrainSection className="bg-char text-paper min-h-[100dvh] flex items-center">
      <Container narrow>
        <div className="mb-10">
          <Link href="/" className="kicker text-gold-soft inline-block">
            V7M · Promotor
          </Link>
        </div>
        {children}
      </Container>
    </GrainSection>
  );
}
