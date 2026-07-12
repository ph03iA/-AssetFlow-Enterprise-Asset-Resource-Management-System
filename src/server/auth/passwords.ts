import { compare, hash } from "bcryptjs";

const passwordRules = {
  minLength: 12,
  maxLength: 72,
} as const;

export type PasswordValidation =
  | { success: true }
  | { success: false; message: string };

export function validatePassword(password: string): PasswordValidation {
  if (password.length < passwordRules.minLength) {
    return {
      success: false,
      message: `Use at least ${passwordRules.minLength} characters.`,
    };
  }

  if (password.length > passwordRules.maxLength) {
    return {
      success: false,
      message: `Use no more than ${passwordRules.maxLength} characters.`,
    };
  }

  if (!/[a-z]/.test(password)) {
    return { success: false, message: "Add a lowercase letter." };
  }

  if (!/[A-Z]/.test(password)) {
    return { success: false, message: "Add an uppercase letter." };
  }

  if (!/\d/.test(password)) {
    return { success: false, message: "Add a number." };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { success: false, message: "Add a symbol." };
  }

  return { success: true };
}

export function hashPassword(password: string) {
  return hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}
