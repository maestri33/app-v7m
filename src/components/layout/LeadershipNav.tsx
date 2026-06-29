"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegação do console do coordenador. Por ora só Revisões e Leads estão
 * ligados (L1); as demais seções entram nos próximos milestones e aparecem
 * como "em breve" pra não levar a 404.
 */
const ITEMS: { href: string; label: string; exact?: boolean; soon?: boolean }[] = [
  { href: "/coordenador", label: "Revisões", exact: true },
  { href: "/coordenador/leads", label: "Leads" },
  { href: "/coordenador/candidatos", label: "Candidatos" },
  { href: "/coordenador/matriculas", label: "Matrículas" },
  { href: "/coordenador/alunos", label: "Alunos" },
  { href: "/coordenador/promotores", label: "Promotores" },
  { href: "/coordenador/treinamento", label: "Treinamento" },
];

export function LeadershipNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-x-5 gap-y-1 text-sm"
      aria-label="Seções do coordenador"
    >
      {ITEMS.map((it) => {
        if (it.soon) {
          return (
            <span
              key={it.href}
              title="Em breve"
              aria-disabled="true"
              className="inline-flex items-center min-h-11 border-b-2 border-transparent text-brand-muted/50 cursor-not-allowed"
            >
              {it.label}
            </span>
          );
        }
        const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "inline-flex items-center min-h-11 border-b-2 border-brand-gold-ink text-brand-gold-ink font-medium"
                : "inline-flex items-center min-h-11 border-b-2 border-transparent text-brand-muted hover:text-brand-ink transition-colors"
            }
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
