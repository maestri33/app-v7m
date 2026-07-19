"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Escala mínima — abaixo disso o conteúdo fica ilegível; se mesmo assim
// transbordar, o problema é a tela ter conteúdo demais (compactar no design).
const MIN_SCALE = 0.65;

/**
 * FitViewport — enquadra o conteúdo na altura disponível.
 * Se o conteúdo transborda POUCO, encolhe com transform: scale() pra caber SEM
 * scrollar (handoff §23, a técnica `fitToViewport()` da Auth). Mas se for alto
 * demais pra caber legível (precisaria de escala < MIN_SCALE), NÃO corta: volta
 * ao tamanho real e deixa SCROLLAR — o botão de enviar nunca fica inalcançável.
 * Re-mede em resize e em mudança de conteúdo (ResizeObserver, criado uma vez).
 */
export function FitViewport({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      const avail = container.clientHeight;
      // scrollHeight reflete o layout natural — transform NÃO o afeta.
      const needed = content.scrollHeight;
      const ideal = needed > avail ? avail / needed : 1;
      if (ideal >= MIN_SCALE) {
        // Cabe encolhendo (ou já cabe) → mantém o "não scrolla".
        setScale((prev) => (Math.abs(prev - ideal) > 0.005 ? ideal : prev));
        setScrollable((s) => (s ? false : s));
      } else {
        // Alto demais pra caber legível → tamanho real + scroll (nada cortado).
        setScale((prev) => (prev !== 1 ? 1 : prev));
        setScrollable((s) => (s ? s : true));
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex justify-center ${scrollable ? "overflow-y-auto" : "overflow-hidden"} ${className}`}
    >
      <div
        ref={contentRef}
        style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        className="w-full max-w-md"
      >
        {children}
      </div>
    </div>
  );
}
