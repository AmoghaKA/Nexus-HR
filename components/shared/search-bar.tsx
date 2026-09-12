"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function SearchBar({
  placeholder = "Search…",
  value,
  onChange,
  className,
}: SearchBarProps) {
  const [internal, setInternal] = React.useState("");
  const query = value ?? internal;

  const update = (next: string) => {
    setInternal(next);
    onChange?.(next);
  };

  return (
    <div className={className}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => update(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-8"
        />
        {query && (
          <button
            type="button"
            onClick={() => update("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}