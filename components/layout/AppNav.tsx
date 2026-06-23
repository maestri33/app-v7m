"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, DollarSign, UserCircle } from "lucide-react";

/**
 * Bottom navigation do contexto PROMOTOR (base de todo mundo que passou do funil).
 * Mobile-first: 4 itens (Início · Leads · Comissões · Conta), fixos na base,
 * ícone+label, alvo de toque ≥44px. Só aparece no contexto promoter e quando
 * training não está travado.
 */
const ITEMS: {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}[] = [
  { href: "/painel", label: "Início", icon: Home, exact: true },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/comissoes", label: "Comissões", icon: DollarSign },
  { href: "/conta", label: "Conta", icon: UserCircle },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-line-light bg-paper-soft/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const active = it.exact
            ? pathname === it.href
            : pathname.startsWith(it.href);

          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex min-h-14 min-w-[72px] flex-col items-center justify-center px-2 py-1 text-xs font-medium text-gold-ink transition-colors"
                  : "flex min-h-14 min-w-[72px] flex-col items-center justify-center px-2 py-1 text-xs text-muted-on-light transition-colors hover:text-black"
              }
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
