"use client";

import { useState, useTransition } from "react";

export interface AiRunStatus {
  ok: boolean;
  error?: string;
}

/**
 * Shared state for AI-powered panels: pending transition flag + last result.
 */
export function useAiRun<R extends AiRunStatus>() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<R | null>(null);

  function run(fn: () => Promise<R>) {
    startTransition(async () => {
      setResult(null);
      const next = await fn();
      setResult(next);
    });
  }

  return { isPending, result, run };
}