import type { EarlyAccessApplication } from "./types.ts";

const BRAND = {
  navy950: "#070e1a",
  navy900: "#0c1829",
  navy800: "#122240",
  blue500: "#4a8fc4",
  blue400: "#5b9fd4",
  warm50: "#f9f7f4",
  warm100: "#f0ebe4",
  gray500: "#5a6578",
  gray200: "#d8e0ea",
  white: "#ffffff",
  siteUrl: "https://hospitalityflow.co.uk",
  contactEmail: "hello@hospitalityflow.co.uk",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  "independent-hotel": "Independent hotel",
  "boutique-hotel": "Boutique hotel",
  "small-hotel-group": "Small hotel group (2–10 hotels)",
  "guest-house": "Guest house",
  "serviced-apartment": "Serviced apartment",
  "hotel-opening-soon": "Hotel opening soon",
  other: "Other",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPropertyType(value: string): string {
  return PROPERTY_TYPE_LABELS[value] ?? value.replace(/-/g, " ");
}

function formatSubmissionDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/London",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function emailShell(options: {
  preheader: string;
  title: string;
  bodyHtml: string;
}): string {
  const preheader = escapeHtml(options.preheader);
  const title = escapeHtml(options.title);

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .content-pad { padding: 24px 20px !important; }
      .header-pad { padding: 28px 20px !important; }
      .footer-pad { padding: 20px !important; }
      h1 { font-size: 22px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.warm50};font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.warm50};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
          <tr>
            <td class="header-pad" style="background:linear-gradient(135deg, ${BRAND.navy950} 0%, ${BRAND.navy900} 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.blue400};font-weight:600;">Hospitality Flow</p>
              <h1 style="margin:0;font-size:26px;line-height:1.3;font-weight:700;color:${BRAND.white};">${title}</h1>
            </td>
          </tr>
          <tr>
            <td class="content-pad" style="background-color:${BRAND.white};padding:36px 40px;border-left:1px solid ${BRAND.gray200};border-right:1px solid ${BRAND.gray200};">
              ${options.bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="footer-pad" style="background-color:${BRAND.navy950};border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border:1px solid ${BRAND.navy800};border-top:none;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:${BRAND.white};">Hospitality <span style="color:${BRAND.blue500};">Flow</span></p>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#a8b4c4;">AI That Helps Hotels Run Better.</p>
              <p style="margin:0;font-size:12px;color:#7a8799;">
                <a href="${BRAND.siteUrl}" style="color:${BRAND.blue400};text-decoration:none;">hospitalityflow.co.uk</a>
                &nbsp;&middot;&nbsp;
                <a href="mailto:${BRAND.contactEmail}" style="color:${BRAND.blue400};text-decoration:none;">${BRAND.contactEmail}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function bulletList(items: string[]): string {
  const lis = items
    .map(
      (item) =>
        `<li style="margin:0 0 10px;padding-left:4px;font-size:15px;line-height:1.55;color:${BRAND.gray500};">${escapeHtml(item)}</li>`,
    )
    .join("");

  return `<ul style="margin:0 0 24px;padding:0 0 0 20px;">${lis}</ul>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:${BRAND.gray500};">${text}</p>`;
}

function highlightBox(html: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr>
      <td style="background-color:${BRAND.warm50};border:1px solid ${BRAND.warm100};border-radius:12px;padding:20px 22px;">
        ${html}
      </td>
    </tr>
  </table>`;
}

export function buildApplicantConfirmationEmail(
  application: EarlyAccessApplication,
): { subject: string; html: string } {
  const firstName = escapeHtml(application.first_name.trim() || "there");

  const bodyHtml = [
    paragraph(`Hi ${firstName},`),
    paragraph(
      "Thank you for applying to the <strong style=\"color:#122240;\">Hospitality Flow Founding Pilot Programme</strong>. We&rsquo;re delighted you&rsquo;re interested in shaping the future of AI-powered hotel operations.",
    ),
    highlightBox(
      `<p style="margin:0;font-size:15px;line-height:1.6;color:#122240;font-weight:600;">Your application has been received.</p>`,
    ),
    paragraph(
      "Every application is <strong style=\"color:#122240;\">personally reviewed</strong> by our team. We work with a limited number of founding pilot hotels so we can provide meaningful onboarding and support.",
    ),
    paragraph("<strong style=\"color:#122240;\">What happens next</strong>"),
    bulletList([
      "We review your property details and operational fit for the pilot.",
      "If selected, we will contact you directly to arrange a personal onboarding call.",
      "You will receive complimentary pilot access and ongoing support throughout the programme.",
    ]),
    paragraph("<strong style=\"color:#122240;\">Founding Pilot benefits</strong>"),
    bulletList([
      "Complimentary pilot access",
      "Personal onboarding and ongoing support",
      "Direct influence on product development",
      "Opportunity to become a published pilot success story",
      "Founder pricing of £49/month while continuously subscribed after the pilot",
    ]),
    paragraph(
      `If you have any questions in the meantime, reply to this email or contact us at <a href="mailto:${BRAND.contactEmail}" style="color:${BRAND.blue500};text-decoration:none;">${BRAND.contactEmail}</a>.`,
    ),
    paragraph("We look forward to learning more about your hotel."),
    `<p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.gray500};">Warm regards,<br><strong style="color:#122240;">The Hospitality Flow Team</strong></p>`,
  ].join("");

  return {
    subject: "Welcome to the Hospitality Flow Founding Pilot Programme",
    html: emailShell({
      preheader: "Your Founding Pilot application has been received.",
      title: "Application received",
      bodyHtml,
    }),
  };
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${BRAND.gray200};font-size:13px;font-weight:600;color:#122240;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${BRAND.gray200};font-size:14px;line-height:1.5;color:${BRAND.gray500};vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`;
}

export function buildOwnerNotificationEmail(
  application: EarlyAccessApplication,
): { subject: string; html: string } {
  const roomCount =
    application.room_count != null ? String(application.room_count) : "Not provided";

  const detailsTable = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0;">
    ${detailRow("Applicant name", application.first_name)}
    ${detailRow("Email", application.email)}
    ${detailRow("Hotel", application.property_name)}
    ${detailRow("Role", application.role)}
    ${detailRow("Property type", formatPropertyType(application.property_type))}
    ${detailRow("Room count", roomCount)}
    ${detailRow("Submission date", formatSubmissionDate(application.submitted_at))}
  </table>`;

  const bodyHtml = [
    paragraph("A new Founding Pilot Programme application has been submitted."),
    highlightBox(detailsTable),
    paragraph(
      `Review applications in the Supabase dashboard under <strong style="color:#122240;">early_access_applications</strong>.`,
    ),
  ].join("");

  return {
    subject: "New Founding Pilot Application",
    html: emailShell({
      preheader: `New application from ${application.first_name} at ${application.property_name}.`,
      title: "New Founding Pilot Application",
      bodyHtml,
    }),
  };
}

export function getOwnerNotificationEmail(): string | null {
  const value = Deno.env.get("OWNER_NOTIFICATION_EMAIL");
  if (!value || !value.trim()) {
    return null;
  }
  return value.trim();
}
