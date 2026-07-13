"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** scrim opacity override (default 55% light / 70% dark via --scrim) */
  scrimClass?: string;
  /** max-width constraint (default "max-w-lg") */
  size?: "sm" | "md" | "lg";
};

const sizeClass = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

/**
 * Modal acessível: focus-trap, ESC fecha, restaura foco ao fechar,
 * `role="dialog" aria-modal`, scrim usa --scrim do tema ativo.
 * Radix só se a11y de foco custar caro — este cobre o caso padrão.
 */
export function Modal({
  open,
  onClose,
  children,
  scrimClass,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Guarda quem disparou a abertura (p/ restaurar foco no close)
  useEffect(() => {
    if (open) triggerRef.current = document.activeElement;
  }, [open]);

  // Abre/fecha o <dialog>
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
      // Restaura foco ao gatilho
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
      triggerRef.current = null;
    }
  }, [open]);

  // ESC → onClose (o <dialog> já faz isso nativamente, mas garantimos)
  const onCancel = useCallback(
    (e: React.SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
      onClose();
    },
    [onClose],
  );

  // Click no scrim → onClose
  const onScrimClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === dialogRef.current) onClose();
    },
    [onClose],
  );

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      onClick={onScrimClick}
      aria-modal={open ? true : undefined}
      className={`fixed inset-0 z-50 m-auto w-full max-h-[90dvh] rounded-[var(--radius)]
        bg-[var(--surface)] text-[var(--surface-text)]
        border border-[var(--surface-border)]
        shadow-2xl backdrop:bg-[var(--scrim)] backdrop:backdrop-blur-sm
        ${sizeClass[size]}
        open:flex open:flex-col
        ${scrimClass ?? ""}`}
    >
      <button
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-3 right-3 p-2 rounded-full
          text-[var(--surface-text-muted)] hover:text-[var(--surface-text)]
          hover:bg-[var(--surface-border)] transition-colors duration-150
          min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <X aria-hidden className="w-5 h-5" />
      </button>
      <div className="p-6 overflow-y-auto">{children}</div>
    </dialog>
  );
}
