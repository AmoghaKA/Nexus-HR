"use client";

import * as React from "react";

import {
  type WorkspaceRole,
  RoleSelection,
} from "@/components/auth/role-selection";
import { SignUpForm } from "@/components/auth/sign-up-form";

export function SignUpFlow() {
  const [role, setRole] = React.useState<WorkspaceRole | null>(null);

  if (!role) {
    return (
      <RoleSelection
        title="Who's joining?"
        description="Choose the workspace you'd like to create an account for."
        onSelect={setRole}
      />
    );
  }

  return <SignUpForm role={role} onBack={() => setRole(null)} />;
}