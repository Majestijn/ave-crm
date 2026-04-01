/**
 * React Hook Form + Zod often attach array item errors under nested keys
 * (e.g. network_roles.0) without a top-level `message`. TextField only reads
 * the root `message`, so we collect the first nested message we find.
 */
export function flattenRhfFieldErrorMessage(err: unknown): string | undefined {
  if (err == null) return undefined;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  if (Array.isArray(err)) {
    for (const item of err) {
      const m = flattenRhfFieldErrorMessage(item);
      if (m) return m;
    }
  }
  if (typeof err === "object" && err !== null) {
    for (const [key, val] of Object.entries(err)) {
      if (key === "ref") continue;
      const m = flattenRhfFieldErrorMessage(val);
      if (m) return m;
    }
  }
  return undefined;
}
