import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  PromotoresList,
  type PromoterWithPending,
} from "@/components/leadership/PromotoresList";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import {
  LEADERSHIP,
  type HubPromoterRow,
  type PendingMaterial,
  type ReviewsOut,
} from "@/lib/api/leadership";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promotores" };

// GET /leadership/promoters → HubPromoterRowOut[] (status active/suspended + locked).
// O `locked` diz que há matéria obrigatória pendente, mas a ROW não traz os ids das
// matérias — esses vivem no balde locked_promoters de GET /reviews (com
// pending_materials). Buscamos os dois e fazemos o merge por promoter_external_id,
// pra a ação de aprovar matéria ter o material_external_id. As ações (suspender/
// reativar/aprovar matéria) mexem em status/acesso reais → confirmação em 2 passos.
export default async function PromotoresPage() {
  let rows: HubPromoterRow[] | null = null;
  let errorCode: string | null = null;
  try {
    rows = await djangoFetch<HubPromoterRow[]>(`${LEADERSHIP}/promoters`);
  } catch (e) {
    errorCode = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  // Matérias em aberto por promotor (best-effort: se /reviews falhar, seguimos só
  // com os promotores — o `locked` ainda aparece, sem o detalhe das matérias).
  const pendingByPromoter = new Map<string, PendingMaterial[]>();
  try {
    const reviews = await djangoFetch<ReviewsOut>(`${LEADERSHIP}/reviews`);
    for (const item of reviews.locked_promoters ?? []) {
      const pid = item.promoter_external_id ?? item.external_id;
      const materials = Array.isArray(item.pending_materials)
        ? (item.pending_materials as PendingMaterial[])
        : [];
      if (pid) pendingByPromoter.set(pid, materials);
    }
  } catch {
    // ignora — fila de matérias é complemento, não bloqueia a lista de promotores
  }

  const items: PromoterWithPending[] = (rows ?? []).map((p) => ({
    ...p,
    pending_materials: pendingByPromoter.get(p.external_id) ?? [],
  }));

  return (
    <Container className="py-10">
      <PageHeader
        kicker="V7M · Coordenador"
        title="Promotores"
        subtitle="Os promotores do seu polo — suspender, reativar e destravar quem está preso no treino."
      />

      {errorCode ? (
        <Card className="text-brand-muted">
          Não deu pra carregar os promotores agora ({errorCode}). Atualize a página.
        </Card>
      ) : items.length === 0 ? (
        <Card className="text-brand-muted">
          Nenhum promotor no seu polo por enquanto.
        </Card>
      ) : (
        <PromotoresList items={items} />
      )}
    </Container>
  );
}
