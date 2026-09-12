"use client";

import * as React from "react";

import {
  type WorkspaceRole,
  RoleSelection,
} from "@/components/auth/role-selection";
import { SignInForm } from "@/components/auth/sign-in-form";

export function SignInFlow() {
  const [role, setRole] = React.useState<WorkspaceRole | null>(null);

  if (!role) {
    return <RoleSelection onSelect={setRole} />;
  }

  return <SignInForm role={role} onBack={() => setRole(null)} />;
}