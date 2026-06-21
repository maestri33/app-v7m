/**
 * Tipos do sub-router `leadership` (console do coordenador).
 *
 * Alinhados aos schemas REAIS do OpenAPI vivo (verificado 2026-06-21):
 * HubLeadRowOut, HubLeadDetailOut, ReviewsOut/ReviewItemOut, PaginatedOut.
 * Onde a spec ainda devolve objeto livre (enrollments/{id}, candidates/{id},
 * students/{id}), tipamos permissivo e renderizamos defensivamente.
 */

export const LEADERSHIP = "/api/v1/leadership";

/** Linha da lista de leads do polo — `HubLeadRowOut`. */
export type HubLeadRow = {
  external_id: string;
  status: string;
  name: string | null;
  phone: string | null;
  promoter_external_id: string | null;
  payment_link: string | null;
  receipt_url: string | null;
};

/**
 * Detalhe do lead — `HubLeadDetailOut`. `customer`/`promoter`/`checkout` são
 * objetos aninhados (LeadCustomerOut/LeadPromoterOut/LeadCheckoutOut); os campos
 * internos não estão enumerados na spec → render defensivo.
 */
export type LeadDetail = {
  external_id: string;
  status: string;
  failed_reason?: string | null;
  created_at?: string | null;
  customer?: Record<string, unknown> | null;
  promoter?: Record<string, unknown> | null;
  checkout?: Record<string, unknown> | null;
};

/** Item de qualquer balde do `/reviews` — `ReviewItemOut` (normalizado). */
export type ReviewItem = {
  external_id: string;
  type: "enrollment" | "candidate" | "student" | "promoter" | (string & {});
  kind:
    | "rg"
    | "selfie"
    | "document"
    | "awaiting_approval"
    | "locked_training"
    | (string & {});
  name?: string | null;
  doc_type?: string | null;
  since?: string | null;
  rejected?: boolean | null;
  document_external_id?: string | null;
  student_external_id?: string | null;
  promoter_external_id?: string | null;
  pending_materials?: unknown;
};

/** Resposta do `/reviews` — `ReviewsOut`: 7 baldes de `ReviewItem`. */
export type ReviewsOut = {
  enrollment_rg: ReviewItem[];
  enrollment_selfie: ReviewItem[];
  candidate_document: ReviewItem[];
  candidate_selfie: ReviewItem[];
  student_documents: ReviewItem[];
  candidates_awaiting_approval: ReviewItem[];
  locked_promoters: ReviewItem[];
};

/** Envelope paginado do back — `PaginatedOut` (ex.: GET /students). */
export type PaginatedOut<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};
