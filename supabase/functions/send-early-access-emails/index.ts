import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  hasValidInternalSecret,
  readInternalSecretEnv,
  unauthorizedResponse,
} from "../_shared/internal-auth.ts";
import {
  buildApplicantConfirmationEmail,
  buildOwnerNotificationEmail,
  getOwnerNotificationEmail,
} from "../_shared/email-templates.ts";
import { sendEmail } from "../_shared/resend.ts";
import type { EarlyAccessApplication, EmailSendResult } from "../_shared/types.ts";

const INTERNAL_SECRET_ENV = "EARLY_ACCESS_EMAILS_INTERNAL_SECRET";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const APPLICATION_SELECT =
  "id, first_name, email, property_name, property_type, room_count, role, source, submitted_at, applicant_email_sent_at, owner_email_sent_at";

function normalizeApplicationRow(
  row: Record<string, unknown> | null,
): EarlyAccessApplication | null {
  if (!row || typeof row.id !== "string") {
    return null;
  }

  return {
    id: row.id,
    first_name: String(row.first_name || ""),
    email: String(row.email || ""),
    property_name: String(row.property_name || ""),
    property_type: String(row.property_type || ""),
    room_count: typeof row.room_count === "number" ? row.room_count : null,
    role: String(row.role || ""),
    source: String(row.source || "early-access-programme"),
    submitted_at: String(row.submitted_at || new Date().toISOString()),
    applicant_email_sent_at: typeof row.applicant_email_sent_at === "string"
      ? row.applicant_email_sent_at
      : null,
    owner_email_sent_at: typeof row.owner_email_sent_at === "string"
      ? row.owner_email_sent_at
      : null,
  };
}

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service credentials are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadApplication(
  applicationId: string,
): Promise<EarlyAccessApplication | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("early_access_applications")
    .select(APPLICATION_SELECT)
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    console.error("[send-early-access-emails] Failed to load application:", error);
    throw new Error("Could not load application.");
  }

  return normalizeApplicationRow(data);
}

async function markEmailSent(
  applicationId: string,
  field: "applicant_email_sent_at" | "owner_email_sent_at",
): Promise<void> {
  const supabase = createServiceClient();
  const timestamp = new Date().toISOString();

  const { error } = await supabase
    .from("early_access_applications")
    .update({ [field]: timestamp })
    .eq("id", applicationId);

  if (error) {
    console.error(
      `[send-early-access-emails] Failed to update ${field} for ${applicationId}:`,
      error,
    );
  }
}

async function sendApplicationEmails(
  application: EarlyAccessApplication,
): Promise<EmailSendResult> {
  const result: EmailSendResult = {
    applicantEmailSent: !!application.applicant_email_sent_at,
    ownerEmailSent: !!application.owner_email_sent_at,
    alreadySent:
      !!application.applicant_email_sent_at && !!application.owner_email_sent_at,
    errors: [],
  };

  if (result.alreadySent) {
    return result;
  }

  if (!application.applicant_email_sent_at) {
    const template = buildApplicantConfirmationEmail(application);
    const sendResult = await sendEmail({
      to: application.email,
      subject: template.subject,
      html: template.html,
      replyTo: Deno.env.get("RESEND_REPLY_TO") ?? undefined,
    });

    if (sendResult.ok) {
      result.applicantEmailSent = true;
      await markEmailSent(application.id, "applicant_email_sent_at");
      console.log(
        `[send-early-access-emails] Applicant email sent (${sendResult.id}) for ${application.id}`,
      );
    } else {
      result.errors.push(`Applicant email: ${sendResult.error}`);
      console.error(
        `[send-early-access-emails] Applicant email failed for ${application.id}:`,
        sendResult.error,
      );
    }
  }

  if (!application.owner_email_sent_at) {
    const ownerEmail = getOwnerNotificationEmail();
    if (!ownerEmail) {
      result.errors.push("Owner email: OWNER_NOTIFICATION_EMAIL is not configured.");
      console.error(
        "[send-early-access-emails] OWNER_NOTIFICATION_EMAIL is not configured.",
      );
    } else {
      const template = buildOwnerNotificationEmail(application);
      const sendResult = await sendEmail({
        to: ownerEmail,
        subject: template.subject,
        html: template.html,
        replyTo: application.email,
      });

      if (sendResult.ok) {
        result.ownerEmailSent = true;
        await markEmailSent(application.id, "owner_email_sent_at");
        console.log(
          `[send-early-access-emails] Owner email sent (${sendResult.id}) for ${application.id}`,
        );
      } else {
        result.errors.push(`Owner email: ${sendResult.error}`);
        console.error(
          `[send-early-access-emails] Owner email failed for ${application.id}:`,
          sendResult.error,
        );
      }
    }
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  if (!readInternalSecretEnv(INTERNAL_SECRET_ENV)) {
    console.error(
      "[send-early-access-emails] Refusing request: internal secret not configured.",
    );
    return unauthorizedResponse(jsonResponse);
  }

  if (!hasValidInternalSecret(req, INTERNAL_SECRET_ENV)) {
    console.warn("[send-early-access-emails] Rejected unauthorized request.");
    return unauthorizedResponse(jsonResponse);
  }

  try {
    let body: { applicationId?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const applicationId = typeof body.applicationId === "string"
      ? body.applicationId.trim()
      : "";

    if (!applicationId || !UUID_RE.test(applicationId)) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    const application = await loadApplication(applicationId);
    if (!application) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    const emailResult = await sendApplicationEmails(application);

    return jsonResponse({
      ok: true,
      applicationId: application.id,
      applicantEmailSent: emailResult.applicantEmailSent,
      ownerEmailSent: emailResult.ownerEmailSent,
      alreadySent: emailResult.alreadySent,
      emailWarning:
        !emailResult.applicantEmailSent || !emailResult.ownerEmailSent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    console.error("[send-early-access-emails] Unhandled error:", message);
    return jsonResponse({ error: "Request could not be processed." }, 500);
  }
});
