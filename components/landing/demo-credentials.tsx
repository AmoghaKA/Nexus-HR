"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Landing-page helper: a row of text with a copy-to-clipboard action, used for
 * the demo credentials so visitors can click-to-copy instead of retyping.
 */
export function CopyableRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API unavailable — the row still shows the value to type.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${label}`}
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-md border border-transparent px-2.5 py-1.5 text-left transition-colors",
        "hover:border-[#c8c9f3] hover:bg-white/70"
      )}
    >
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-[#8a8a92]">
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-right text-xs text-[#17191f]",
          mono && "font-mono"
        )}
      >
        {value}
      </span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
      ) : (
        <Copy
          className="h-3.5 w-3.5 shrink-0 text-[#9a9aa2] transition-colors group-hover:text-[#3e43d8]"
          aria-hidden="true"
        />
      )}
    </button>
  );
}