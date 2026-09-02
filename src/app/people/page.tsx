import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { PeopleSearch } from "@/components/people-search";

export const metadata: Metadata = {
  title: "Find people",
};

export default async function PeoplePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-8 py-12">
      <h1 className="font-display text-2xl text-paper">Find people</h1>
      <PeopleSearch />
    </main>
  );
}
