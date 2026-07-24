import { notFound } from "next/navigation";
import { EmailPrototypePreview } from "./EmailPrototypePreview";

export default function EmailPrototypePreviewPage() {
  if (process.env.NODE_ENV === "production" && process.env.APP_ENV !== "test") {
    notFound();
  }

  return <EmailPrototypePreview />;
}
