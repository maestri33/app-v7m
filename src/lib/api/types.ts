/**
 * Tipos canônicos do backend Django (sub-router `collaborators`).
 *
 * O backend devolve `me_dict` em toda mutação — esses shapes vêm do
 * `users/roles/candidate/service.py:me_dict` + `address/as_public_dict`.
 */

// Valores exatos do backend (users/roles/candidate/models.py:Status — minúsculos).
export type CandidateStatus =
  | "started"
  | "profile"
  | "address"
  | "documents"
  | "pix"
  | "selfie"
  | "completed";

export type AnalysisStatus = "pending" | "approved" | "rejected" | "review";

export type AddressSection = {
  zipcode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  missing_fields: string[];
};

export type ProfileSection = {
  mother_name: string | null;
  father_name: string | null;
  birthplace: string | null;
  marital_status: string | null;
  nationality: string | null;
  // do CPFHub — read-only
  name: string | null;
  birth_date: string | null;
};

export type DocumentSection = {
  doc_type?: string;
  number?: string;
  issuing_agency?: string | null;
  issue_date?: string | null;
  category?: string | null;
  national_register?: string | null;
  date_of_birth?: string | null;
  expires_on?: string | null;
  analysis_status?: AnalysisStatus;
  analysis_reason?: string | null;
  missing_fields?: string[];
  has_front?: boolean;
  has_back?: boolean;
  has_full?: boolean;
  [k: string]: unknown;
};

export type PixSection = {
  key?: string | null;
  key_type?: string | null;
  validated_at?: string | null;
};

export type SelfieSection = {
  taken_at?: string | null;
  analysis_status?: AnalysisStatus;
  analysis_reason?: string | null;
  expires_at?: string | null;
  [k: string]: unknown;
};

export type CandidateMe = {
  status: CandidateStatus;
  profile: ProfileSection | null;
  address: AddressSection | null;
  documents?: DocumentSection | null;
  selfie?: SelfieSection | null;
  pix?: PixSection | null;
};

export type PromoterMe = {
  external_id: string;
  hub_external_id: string;
  status: "active" | "suspended";
  ref_url: string;
  pix_key?: string | null;
};

/**
 * `GET /promoter/me/summary` — números do dashboard direto do backend (parar
 * de calcular no front). Valores monetários são STRING decimal.
 */
export type PromoterSummary = {
  week_goal: number;
  week_paid_leads: number;
  week_commission_total: string;
  bonus_amount: string;
  goal_reached: boolean;
  next_closing_at: string;
  week_start?: string | null;
  lifetime: {
    total_received: string;
    total_students: number;
    goals_hit: number;
  };
};

/** `PromoterLeadOut` — agora com `name`/`phone` pro CTA de WhatsApp. */
export type Lead = {
  external_id: string;
  name: string;
  phone?: string | null;
  status: string;
  payment_link?: string | null;
  receipt_url?: string | null;
  hub_name?: string;
  created_at: string;
};

/**
 * `TrainingMaterialOut` (shape novo): `blocking` separa obrigatória de extra;
 * `submission_status` é o estado da ÚLTIMA resposta (null = nunca respondeu).
 */
export type TrainingMaterial = {
  external_id: string;
  title: string;
  prompt: string;
  blocking: boolean;
  kind?: string | null;
  assignment_status?: string | null;
  submission_status?: string | null;
};

export type TrainingProgress = {
  total: number;
  answered: number;
  average_score: number | null;
  pending_external_ids: string[];
};

export type Commission = {
  external_id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  source_type: string;
  created_at: string;
  paid_at?: string | null;
};
