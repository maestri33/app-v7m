"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, DollarSign, UserCircle } from "lucide-react";

import { LeadInviteDialog } from "@/components/leads/LeadInviteDialog";

/**
 * Bottom navigation do contexto PROMOTOR (base de todo mundo que passou do funil).
 * Mobile-first: 4 destinos + CTA central de matrícula, ícone+label, alvo
 * de toque ≥44px. Rodapé do frame do AppShell (flex `shrink-0`, NÃO `fixed`) —
 * a faixa `.app-scroll` acima é que rola. safe-area na base p/ o home indicator.
 */
const ITEMS: {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}[] = [
  { href: "/painel", label: "Início", icon: Home, exact: true },
  { href: "/leads", label: "Indicações", icon: Users },
  { href: "/comissoes", label: "Comissões", icon: DollarSign },
  { href: "/conta", label: "Conta", icon: UserCircle },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="Navegação principal">
      <div className="app-nav-inner">
        {ITEMS.map((it, index) => {
          const Icon = it.icon;
          const active = it.exact
            ? pathname === it.href
            : pathname.startsWith(it.href);

          return (
            <div key={it.href} className="contents">
              {index === 2 && <LeadInviteDialog />}
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "app-nav-link app-nav-link-active"
                    : "app-nav-link"
                }
              >
                <Icon size={21} strokeWidth={active ? 2.25 : 1.8} aria-hidden="true" />
                <span>{it.label}</span>
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
