import { DomainError } from "@/domain/errors";

export type ActionState = {
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialActionState: ActionState = {};

export function actionFailure(error: unknown): ActionState {
  if (error instanceof DomainError) {
    return { success: false, message: error.message };
  }

  console.error(error);
  return {
    success: false,
    message: "The change could not be saved. Review the values and try again.",
  };
}
