import axios from "axios";

/**
 * Turns an unknown thrown value into a message an operator can act on. API errors carry their
 * message in the response body, so those are preferred over the generic axios text.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === "string" && data.message.trim()) return data.message;
    return error.message || fallback;
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;

  return fallback;
}
