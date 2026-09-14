"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, X } from "lucide-react";

import { updateEmployeeProfile } from "@/lib/employee/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner } from "@/components/hr/ai-shared";

interface ProfileEditFormProps {
  location: string | null;
}

export function ProfileEditForm({ location }: ProfileEditFormProps) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [locationValue, setLocationValue] = React.useState(location ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await updateEmployeeProfile({ location: locationValue });
      if (!res.ok) {
        setError(res.error ?? "Failed to update profile.");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Edit profile
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <ErrorBanner error={error} />}
      <div className="space-y-1.5">
        <Label htmlFor="location" className="text-xs">
          Location
        </Label>
        <Input
          id="location"
          value={locationValue}
          onChange={(e) => setLocationValue(e.target.value)}
          placeholder="e.g. New York, NY"
          className="h-8 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(false); setError(null); setLocationValue(location ?? ""); }}>
          <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
