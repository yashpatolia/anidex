import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return children;
}
