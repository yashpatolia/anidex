import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { ImportView } from "@/components/import-view";

export const metadata: Metadata = {
  title: "Import",
};

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <ImportView />;
}
