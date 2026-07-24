import { notFound } from "next/navigation";

import { DocumentPreview } from "./documentPreview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview · Documento V7M" };

export default function DocumentPrototypePreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <DocumentPreview />;
}
