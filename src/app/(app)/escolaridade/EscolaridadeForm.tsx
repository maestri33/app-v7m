"use client";

import { useRouter } from "next/navigation";

import {
  EducationJourney,
  type EducationCity,
  type EducationJourneyValue,
} from "@/components/education-journey";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";

const CITIES: EducationCity[] = [
  { name: "Ponta Grossa", uf: "PR", ibgeCode: "4119905" },
  { name: "Curitiba", uf: "PR", ibgeCode: "4106902" },
  { name: "Castro", uf: "PR", ibgeCode: "4104907" },
  { name: "Carambeí", uf: "PR", ibgeCode: "4104659" },
  { name: "Palmeira", uf: "PR", ibgeCode: "4117701" },
  { name: "São Paulo", uf: "SP", ibgeCode: "3550308" },
  { name: "Santos", uf: "SP", ibgeCode: "3548500" },
];

type EducationErrorPayload = {
  detail?: string;
  code?: string;
  expected_status?: string;
};

export function EscolaridadeForm() {
  const router = useRouter();

  async function saveEducation(value: EducationJourneyValue) {
    const response = await fetch("/api/me/education", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: value.level,
        grade: value.grade,
        last_completed_grade: value.lastCompletedGrade,
        qualification: value.qualification,
        last_completed_qualification:
          value.lastCompletedQualification === "none"
            ? null
            : value.lastCompletedQualification,
        education_status: value.educationStatus,
        completed:
          value.educationStatus === "completed" &&
          (value.level === "superior" ||
            (value.level === "fundamental" && value.grade === 9) ||
            (value.level === "medio" && value.grade === 3)),
        year: value.year,
        city: value.city ? `${value.city.name} - ${value.city.uf}` : null,
        school: value.school?.trim() || null,
      }),
    });

    const data = (await response.json()) as EducationErrorPayload;
    if (!response.ok) {
      const redirectTo = wrongStatusHref(data.code, data.expected_status);
      if (redirectTo) {
        router.push(redirectTo);
        throw new Error("V7M_SAVE:Redirecionando para a etapa correta.");
      }
      throw new Error(`V7M_SAVE:${apiErrorMessage(data.code, data.detail, data)}`);
    }

    router.push(NEXT_STAGE.education);
  }

  return (
    <EducationJourney
      cities={CITIES}
      onBack={() => router.back()}
      onComplete={saveEducation}
    />
  );
}
