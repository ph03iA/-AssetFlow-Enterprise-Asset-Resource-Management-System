import { describe, expect, it } from "vitest";

import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from "./passwords";
import {
  expiresAfter,
  generateOpaqueToken,
  hashToken,
  PASSWORD_RESET_DURATION_MS,
} from "./tokens";

describe("password security", () => {
  it("requires a strong passphrase", () => {
    expect(validatePassword("short").success).toBe(false);
    expect(validatePassword("alllowercase123!").success).toBe(false);
    expect(validatePassword("NoNumbersHere!").success).toBe(false);
    expect(validatePassword("AssetFlow2026!")).toEqual({ success: true });
  });

  it("hashes passwords and verifies only the matching secret", async () => {
    const passwordHash = await hashPassword("AssetFlow2026!");

    expect(passwordHash).not.toContain("AssetFlow2026!");
    await expect(verifyPassword("AssetFlow2026!", passwordHash)).resolves.toBe(
      true,
    );
    await expect(verifyPassword("AssetFlow2027!", passwordHash)).resolves.toBe(
      false,
    );
  });
});

describe("opaque authentication tokens", () => {
  it("stores a deterministic hash instead of the raw random token", () => {
    const token = generateOpaqueToken();
    const tokenHash = hashToken(token);

    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).not.toBe(token);
    expect(hashToken(token)).toBe(tokenHash);
  });

  it("calculates reset expiry from an injectable clock", () => {
    const now = new Date("2026-07-12T10:00:00.000Z");

    expect(expiresAfter(PASSWORD_RESET_DURATION_MS, now).toISOString()).toBe(
      "2026-07-12T10:30:00.000Z",
    );
  });
});
