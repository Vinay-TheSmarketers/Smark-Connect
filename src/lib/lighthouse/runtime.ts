import { LighthouseAuditError } from "./types";

export const LIGHTHOUSE_OVERALL_TIMEOUT_MS = 180_000;

export async function runWithAuditTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs = LIGHTHOUSE_OVERALL_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await operation(controller.signal);
    if (controller.signal.aborted) throw new LighthouseAuditError("TIMEOUT", "The Lighthouse audit exceeded the 180-second limit.");
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw new LighthouseAuditError("TIMEOUT", "The Lighthouse audit exceeded the 180-second limit.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
