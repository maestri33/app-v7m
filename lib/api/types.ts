/**
 * Tipos canônicos do backend Django (sub-router `collaborators`).
 *
 * O backend devolve `me_dict` em toda mutação — esses shapes vêm do
 * `users/roles/candidate/service.py:me_dict` + `address/as_public_dict`.
 */

export type CandidateStatus =
  | "STARTED"
  | "PROFILE"
  | "ADDRESS"
  | "DOCUMENTS"
  | "PIX"
  | "SELFIE"
  | "COMPLETED";

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

export type CandidateMe = {
  status: CandidateStatus;
  profile: ProfileSection | null;
  address: AddressSection | null;
  documents?: DocumentSection | null;
  selfie?: Record<string, unknown> | null;
};
