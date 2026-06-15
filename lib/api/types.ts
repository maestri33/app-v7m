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

export type CandidateMe = {
  status: CandidateStatus;
  profile: ProfileSection | null;
  address: AddressSection | null;
  // M2b/M2c
  document?: unknown;
  selfie?: unknown;
};
