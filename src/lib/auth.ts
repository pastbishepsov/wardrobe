// Single-user auth: one shared password (APP_PASSWORD) → long-lived signed cookie.
// If APP_PASSWORD is not set, auth is disabled (local development only).

export const COOKIE_NAME = "wardrobe_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // a year

function secret(): string {
  return process.env.APP_SECRET || process.env.APP_PASSWORD || "dev-secret";
}

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toBase64Url(new Uint8Array(sig));
}

export async function makeToken(): Promise<string> {
  const issued = Date.now().toString(36);
  return `${issued}.${await hmac(issued)}`;
}

export async function verifyToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const issued = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(issued);
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.APP_PASSWORD || "";
  if (!expected) return true;
  if (input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < input.length; i++) diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
