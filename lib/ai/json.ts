// ---------------------------------------------------------------------------
// Tolerant JSON extraction shared by all AI providers.
//
// Provider responses often wrap the JSON document in markdown fences or stray
// prose. These helpers dig the first balanced JSON value back out and are
// deliberately lenient so a parser hiccup on one provider doesn't count as a
// failed request when a sibling provider parses cleanly.
// ---------------------------------------------------------------------------

/**
 * Parses JSON from provider text, tolerating markdown fences and stray prose
 * around the JSON document.
 */
export function extractAndParse<T>(text: string): T | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Strip ```json ... ``` (or ``` ... ```) fences.
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim()) as T;
      } catch {
        /* fall through */
      }
    }
    // Fall back to the first balanced JSON object.
    const object = extractBalancedJson(trimmed, "{", "}");
    if (object) {
      try {
        return JSON.parse(object) as T;
      } catch {
        /* fall through */
      }
    }
    const array = extractBalancedJson(trimmed, "[", "]");
    if (array) {
      try {
        return JSON.parse(array) as T;
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

function extractBalancedJson(text: string, open: string, close: string): string | null {
  const start = text.indexOf(open);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") {
        i += 1;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === open) {
      depth += 1;
    } else if (ch === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}