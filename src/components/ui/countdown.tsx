"use client";

import { useEffect, useState } from "react";

function label(target: Date, now: Date): string {
  const msLeft = Math.max(0, target.getTime() - now.getTime());
  const hoursLeft = Math.floor(msLeft / 3_600_000);
  const daysLeft = Math.floor(hoursLeft / 24);
  const minLeft = Math.floor((msLeft % 3_600_000) / 60_000);
  if (daysLeft > 0) return `${daysLeft}d ${hoursLeft % 24}h`;
  if (hoursLeft > 0) return `${hoursLeft}h ${minLeft}min`;
  return `${minLeft}min`;
}

/**
 * Contagem regressiva até um instante ISO (fechamento da semana). Só calcula no
 * client (depende do relógio — evita mismatch de hidratação) e atualiza a cada
 * 30s.
 */
export function Countdown({ target }: { target: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const t = new Date(target);
    if (Number.isNaN(t.getTime())) return;
    const tick = () => setText(label(t, new Date()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [target]);

  if (!text) return <span aria-hidden>…</span>;
  return <span>{text}</span>;
}
