"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark" | "system";

function resolveTheme(t: Theme): "light" | "dark" {
  if (t === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return t;
}

function applyTheme(t: Theme) {
  const r = t === "system" ? resolveTheme("system") : t;
  document.documentElement.dataset.theme = r;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("v7m-theme") as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  const cycle = () => {
    setTheme((prev) => {
      const next: Theme =
        prev === "light" ? "dark" : prev === "dark" ? "system" : "light";
      localStorage.setItem("v7m-theme", next);
      applyTheme(next);
      return next;
    });
  };

  // ponytail: this exists — toggle mínimo, label visual descritivo
  const resolved = theme === "system" ? resolveTheme(theme) : theme;
  return (
    <button
      onClick={cycle}
      className="inline-flex items-center justify-center p-2 rounded-full
        text-surface-text-muted hover:text-surface-text
        hover:bg-[var(--surface-border)] transition-colors duration-200
        min-w-[44px] min-h-[44px]"
      aria-label={`Tema: ${theme} (${resolved === "dark" ? "escuro" : "claro"}) — clique para alternar`}
      title={`Tema: ${theme}`}
    >
      {resolved === "dark" ? (
        <Moon aria-hidden className="w-5 h-5" />
      ) : (
        <Sun aria-hidden className="w-5 h-5" />
      )}
    </button>
  );
}
