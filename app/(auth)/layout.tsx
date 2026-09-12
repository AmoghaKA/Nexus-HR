import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: {
    default: "Welcome",
    template: "%s | WorkforceIQ",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthShell>{children}</AuthShell>;
}