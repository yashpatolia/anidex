import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Home",
};

export default function Home() {
  return <LandingPage />;
}
