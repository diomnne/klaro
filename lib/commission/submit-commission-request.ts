import type { CommissionRequestPayload } from "./types";

export interface SubmitResult {
  success: true;
  message: string;
}

export async function submitCommissionRequest(
  payload: CommissionRequestPayload
): Promise<SubmitResult> {
  console.log(payload);

  return {
    success: true,
    message: "Request received! I'll review it and follow up to confirm your slot.",
  };
}
