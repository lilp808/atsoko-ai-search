// Simple demo gate: password lives ONLY in env (DEMO_PASSWORD, server-side).
// The auth cookie is HMAC_SHA256(password, fixed-message) hex — the server can
// verify it by recomputation, no session store needed. Uses Web Crypto so the
// same code runs in Node (API routes) and Edge (middleware).

export const AUTH_COOKIE = "demo_auth";
const HMAC_MESSAGE = "atsoko-demo-auth-v1";

const enc = new TextEncoder();

async function hmacHex(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(HMAC_MESSAGE));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time string compare (length + content) to avoid timing leaks.
export function safeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

// Mint the cookie value after a successful password check.
export function mintAuthCookie(password: string): Promise<string> {
  return hmacHex(password);
}

// True when the cookie matches the current DEMO_PASSWORD.
export async function isValidAuthCookie(
  cookieValue: string | undefined,
  password: string | undefined,
): Promise<boolean> {
  if (!cookieValue || !password) return false;
  const expected = await hmacHex(password);
  return safeEqual(cookieValue, expected);
}
