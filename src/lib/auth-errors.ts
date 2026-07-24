/** Normalize Supabase Auth / JWT signing errors for API responses and UI toasts. */
export function sanitizeAuthError(message: string | undefined, fallback = "Something went wrong.") {
  if (!message?.trim()) return fallback;
  const lower = message.toLowerCase();
  if (
    lower.includes("jwt") ||
    lower.includes("kid") ||
    lower.includes("unverifiable") ||
    lower.includes("signing method") ||
    lower.includes("invalid api key")
  ) {
    return "Supabase API keys/JWT signing are misconfigured. In Project Settings → API Keys, set SUPABASE_SECRET_KEY to the secret key (`sb_secret_...`), and ensure JWT signing keys include a kid. Then sign out, clear site cookies, and sign in again.";
  }
  return message;
}

export function isJwtKeyError(message: string | undefined) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("jwt") ||
    lower.includes("kid") ||
    lower.includes("unverifiable") ||
    lower.includes("signing method") ||
    lower.includes("invalid api key")
  );
}
