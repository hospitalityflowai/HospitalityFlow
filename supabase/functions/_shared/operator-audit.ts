/**
 * Best-effort / required operator audit writes via service-role RPC.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type OperatorAuditAction =
  | "approve_invite"
  | "resend_invite"
  | "decline"
  | "restore"
  | "delete_test_application";

export type OperatorAuditInput = {
  operatorUserId: string;
  action: OperatorAuditAction;
  applicationId: string | null;
  applicantEmail: string | null;
  previousFoundingStatus?: string | null;
  newFoundingStatus?: string | null;
  previousAccessStatus?: string | null;
  newAccessStatus?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeOperatorAuditEvent(
  serviceClient: SupabaseClient,
  input: OperatorAuditInput,
): Promise<{ ok: true; auditId: string } | { ok: false; error: string }> {
  const { data, error } = await serviceClient.rpc("write_operator_audit_event", {
    p_operator_user_id: input.operatorUserId,
    p_action: input.action,
    p_application_id: input.applicationId,
    p_applicant_email: input.applicantEmail,
    p_previous_founding_status: input.previousFoundingStatus ?? null,
    p_new_founding_status: input.newFoundingStatus ?? null,
    p_previous_access_status: input.previousAccessStatus ?? null,
    p_new_access_status: input.newAccessStatus ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    return { ok: false, error: error.message || "Audit write failed." };
  }

  return { ok: true, auditId: String(data || "") };
}
