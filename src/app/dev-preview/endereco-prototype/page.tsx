import { notFound } from "next/navigation";

import { AddressPrototypePreview } from "./AddressPrototypePreview";

export const metadata = { title: "Preview · Endereço V7M" };

export default function AddressPrototypePreviewPage() {
  if (process.env.NODE_ENV === "production" && process.env.APP_ENV !== "test") notFound();

  return <AddressPrototypePreview />;
}
