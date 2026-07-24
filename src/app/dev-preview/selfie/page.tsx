import { notFound } from "next/navigation";

import { SelfieExperiencePreview } from "./SelfieExperiencePreview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview · Selfie V7M" };

export default function SelfieExperiencePreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <SelfieExperiencePreview />;
}
