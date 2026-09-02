import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterLayout({ children }: LayoutProps<"/register">) {
  return children;
}
