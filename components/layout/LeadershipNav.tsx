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
  { href: "/coordenador/matriculas", label: "Matrículas", soon: true },
  { href: "/coordenador/alunos", label: "Alunos", soon: true },
  { href: "/coordenador/promotores", label: "Promotores", soon: true },
  { href: "/coordenador/treinamento", label: "Treinamento", soon: true },
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
              className="inline-flex items-center min-h-11 border-b-2 border-transparent text-muted-on-light/50 cursor-not-allowed"
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
                ? "inline-flex items-center min-h-11 border-b-2 border-gold-ink text-gold-ink font-medium"
                : "inline-flex items-center min-h-11 border-b-2 border-transparent text-muted-on-light hover:text-black transition-colors"
            }
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
