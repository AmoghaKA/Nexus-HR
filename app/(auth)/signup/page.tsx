import type { Metadata } from "next";

import { SignUpFlow } from "@/components/auth/sign-up-flow";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return <SignUpFlow />;
}