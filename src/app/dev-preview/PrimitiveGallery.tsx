"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Money } from "@/components/ui/money";
import { DateBR } from "@/components/ui/date-br";
import { Stepper } from "@/components/ui/stepper";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";

/**
 * Galeria viva de primitivos do design system — acessível via /dev-preview?role=ui
 */
export function PrimitiveGallery() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-10">
      {/* ── Stepper ── */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--surface-text-muted)] mb-3">
          Stepper
        </h3>
        <Stepper
          steps={[
            { key: "a", label: "Etapa 1" },
            { key: "b", label: "Etapa 2" },
            { key: "c", label: "Etapa 3" },
            { key: "d", label: "Etapa 4" },
          ]}
          currentIndex={1}
        />
      </section>

      {/* ── Money + DateBR ── */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--surface-text-muted)] mb-3">
          Money & DateBR
        </h3>
        <div className="flex gap-6 text-sm">
          <span>
            <Money value={123456} /> · <Money value={99} /> ·{" "}
            <Money value={0} />
          </span>
          <span>
            <DateBR value="2026-07-13" /> ·{" "}
            <DateBR value="2026-07-13" month="long" /> ·{" "}
            <DateBR value="2026-07-13T14:30:00Z" time />
          </span>
        </div>
      </section>

      {/* ── DataTable ── */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--surface-text-muted)] mb-3">
          DataTable
        </h3>
        <DataTable
          columns={[
            { key: "name", header: "Nome", render: (r) => r.name as string },
            {
              key: "value",
              header: "Valor",
              className: "text-right",
              render: (r) => <Money value={r.value as number} />,
            },
            {
              key: "date",
              header: "Data",
              render: (r) => <DateBR value={r.date as string} />,
            },
          ]}
          rows={[
            { name: "Item A", value: 15000, date: "2026-07-01" },
            { name: "Item B", value: 23450, date: "2026-07-10" },
          ]}
          keyFn={(r) => r.name as string}
        />
      </section>

      {/* ── Modal ── */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--surface-text-muted)] mb-3">
          Modal
        </h3>
        <Button onClick={() => setModalOpen(true)} size="md">
          Abrir modal
        </Button>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
          <h4 className="text-lg font-bold text-[var(--surface-text)] mb-2">
            Modal de exemplo
          </h4>
          <p className="text-sm text-[var(--surface-text-muted)]">
            Focus-trap ativo — Tab circula dentro, ESC fecha, scrim usa{" "}
            <code>--scrim</code> do tema.
          </p>
        </Modal>
      </section>
    </div>
  );
}
