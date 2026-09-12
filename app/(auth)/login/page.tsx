import type { Metadata } from "next";

import { SignInFlow } from "@/components/auth/sign-in-flow";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return <SignInFlow />;
}