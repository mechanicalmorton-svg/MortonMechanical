/** True when the message looks like an API-key / JWT-signing misconfiguration (not a normal auth failure). */
export function isJwtKeyError(message: string | undefined) {
  if (!message) return false;
  const lower = message.toLowerCase();

  // Session expiry / missing session are not key misconfiguration.
  if (
    lower.includes("jwt expired") ||
    lower.includes("token is expired") ||
    lower.includes("session not found") ||
    lower.includes("refresh token")
  ) {
    return false;
  }

  return (
    lower.includes("kid") ||
    lower.includes("unverifiable") ||
    lower.includes("signing method") ||
    lower.includes("invalid api key") ||
    lower.includes("unrecognized jwt") ||
    (lower.includes("es256") && lower.includes("jwt")) ||
    (lower.includes("unable to parse or verify") && lower.includes("jwt"))
  );
}

/** Normalize Supabase Auth / JWT signing errors for API responses and UI toasts. */
export function sanitizeAuthError(message: string | undefined, fallback = "Something went wrong.") {
  if (!message?.trim()) return fallback;
  if (isJwtKeyError(message)) {
    return "Supabase API keys/JWT signing are misconfigured. In Project Settings → API Keys, set SUPABASE_SECRET_KEY to the secret key (`sb_secret_...`), and ensure JWT signing keys include a kid. Then sign out, clear site cookies, and sign in again.";
  }
  return message;
}
