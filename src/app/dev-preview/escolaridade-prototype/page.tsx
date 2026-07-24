import { notFound } from "next/navigation";
import { EducationJourneyPreview } from "./EducationJourneyPreview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview · Escolaridade V7M" };

export default function EducationJourneyPreviewPage() {
  if (process.env.NODE_ENV === "production" && process.env.APP_ENV !== "test") notFound();
  return <EducationJourneyPreview />;
}
