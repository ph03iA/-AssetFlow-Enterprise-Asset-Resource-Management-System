import { createHash, randomBytes } from "node:crypto";

export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_DURATION_MS = 30 * 60 * 1000;

export function generateOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function expiresAfter(durationMs: number, now = new Date()) {
  return new Date(now.getTime() + durationMs);
}
