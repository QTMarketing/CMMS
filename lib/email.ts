import nodemailer from "nodemailer";
import { Resend } from "resend";

const EMAIL_FROM =
  process.env.EMAIL_FROM || "QuickTrack CMMS <no-reply@quicktrackinc.com>";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT
  ? parseInt(process.env.SMTP_PORT, 10)
  : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const smtpEnabled = SMTP_HOST && SMTP_USER && SMTP_PASS;

const transporter = smtpEnabled
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resendEnabled = !!RESEND_API_KEY;
const resend = resendEnabled ? new Resend(RESEND_API_KEY) : null;

/** Returns whether an email provider (Resend or SMTP) is configured. */
export function isEmailConfigured(): boolean {
  return !!(resendEnabled && resend) || !!(smtpEnabled && transporter);
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ sent: boolean; error?: string }> {
  // Prefer Resend if configured
  if (resend && resendEnabled) {
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject,
        html,
      });
      return { sent: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(
        "[email] Failed to send via Resend, falling back to SMTP",
        error
      );
      // Fall through to SMTP
    }
  }

  // Fallback to SMTP if Resend is not available or fails
  if (!transporter || !smtpEnabled) {
    console.warn(
      "[email] No email provider configured (Resend/SMTP), skipping email send"
    );
    return { sent: false, error: "No email provider configured (set RESEND_API_KEY or SMTP_* in env)." };
  }

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[email] Failed to send email via SMTP", error);
    return { sent: false, error: msg };
  }
}

export async function sendWorkOrderAssignedEmail(options: {
  technicianEmail: string;
  technicianName?: string;
  workOrderId: string;
  storeName?: string;
  title?: string;
  description?: string;
  dueDate?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const {
    technicianEmail,
    technicianName,
    workOrderId,
    storeName,
    title,
    description,
    dueDate,
  } = options;

  const lines: string[] = [];

  lines.push(
    `<p>Hi ${technicianName ? technicianName : "there"},</p>`
  );
  lines.push("<p>You have been assigned a new work order.</p>");
  lines.push(`<p><strong>Work Order ID:</strong> ${workOrderId}</p>`);

  if (storeName) {
    lines.push(`<p><strong>Store:</strong> ${storeName}</p>`);
  }

  if (title) {
    lines.push(`<p><strong>Title:</strong> ${title}</p>`);
  }

  if (dueDate) {
    lines.push(`<p><strong>Due Date:</strong> ${dueDate}</p>`);
  }

  if (description) {
    lines.push(`<p><strong>Description:</strong> ${description}</p>`);
  }

  // Build a direct link to the work order in the web app.
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://cmms-theta.vercel.app";
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const workOrderUrl = `${normalizedBase}/workorders/${workOrderId}`;

  lines.push(
    `<p><a href="${workOrderUrl}" style="display:inline-block;padding:8px 14px;margin-top:8px;border-radius:6px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;">View Work Order</a></p>`
  );
  lines.push(
    `<p style="font-size:12px;color:#6b7280;">If the button above does not work, copy and paste this link into your browser:<br /><a href="${workOrderUrl}">${workOrderUrl}</a></p>`
  );

  const html = lines.join("");

  return sendEmail({
    to: technicianEmail,
    subject: `New Work Order Assigned (#${workOrderId})`,
    html,
  });
}

/** Sent to the user who submitted the request (confirmation). */
export async function sendRequestSubmissionConfirmationEmail(options: {
  toEmail: string;
  requestId: string;
  requestNumber?: number | null;
  title?: string;
  storeName?: string;
}): Promise<void> {
  const { toEmail, requestId, requestNumber, title, storeName } = options;
  const displayId =
    requestNumber != null ? String(requestNumber).padStart(4, "0") : requestId;
  const lines: string[] = [];
  lines.push("<p>Your maintenance request has been submitted successfully.</p>");
  lines.push(`<p><strong>Request ID:</strong> #${displayId}</p>`);
  if (title) lines.push(`<p><strong>Title:</strong> ${title}</p>`);
  if (storeName) lines.push(`<p><strong>Store:</strong> ${storeName}</p>`);
  lines.push(
    "<p>An administrator will review your request and you will be notified by email.</p>"
  );
  await sendEmail({
    to: toEmail,
    subject: `Maintenance Request Submitted (#${displayId})`,
    html: lines.join(""),
  });
}

/** Sent to each admin / master admin when a new request is submitted. */
export async function sendRequestSubmittedEmail(options: {
  storeAdminEmail: string;
  requesterName?: string;
  requesterEmail?: string;
  storeName?: string;
  requestId: string;
  requestNumber?: number | null;
  summary?: string;
}): Promise<void> {
  const {
    storeAdminEmail,
    requesterName,
    requesterEmail,
    storeName,
    requestId,
    requestNumber,
    summary,
  } = options;
  const displayId =
    requestNumber != null ? String(requestNumber).padStart(4, "0") : requestId;
  const lines: string[] = [];
  lines.push("<p>A new maintenance request has been submitted.</p>");
  lines.push(`<p><strong>Request ID:</strong> #${displayId}</p>`);
  if (requesterEmail) {
    lines.push(`<p><strong>Submitted by:</strong> ${requesterEmail}</p>`);
  }
  if (requesterName && requesterName !== requesterEmail) {
    lines.push(`<p><strong>Requester name:</strong> ${requesterName}</p>`);
  }
  if (storeName) {
    lines.push(`<p><strong>Store:</strong> ${storeName}</p>`);
  }
  if (summary) {
    lines.push(`<p><strong>Summary:</strong> ${summary}</p>`);
  }
  await sendEmail({
    to: storeAdminEmail,
    subject: `New Maintenance Request (#${displayId})`,
    html: lines.join(""),
  });
}

export async function sendWorkOrderUpdateEmail(options: {
  userEmail: string;
  userName?: string;
  workOrderId: string;
  workOrderTitle?: string;
  updateMessage?: string;
  status?: string;
}): Promise<void> {
  const {
    userEmail,
    userName,
    workOrderId,
    workOrderTitle,
    updateMessage,
    status,
  } = options;

  const lines: string[] = [];

  lines.push(
    `<p>Hi ${userName ? userName : "there"},</p>`
  );
  lines.push("<p>Your work order has been updated.</p>");
  lines.push(`<p><strong>Work Order ID:</strong> ${workOrderId}</p>`);

  if (workOrderTitle) {
    lines.push(`<p><strong>Title:</strong> ${workOrderTitle}</p>`);
  }

  if (status) {
    lines.push(`<p><strong>Status:</strong> ${status}</p>`);
  }

  if (updateMessage) {
    lines.push(`<p><strong>Update:</strong> ${updateMessage}</p>`);
  }

  const html = lines.join("");

  await sendEmail({
    to: userEmail,
    subject: `Work Order Updated (#${workOrderId})`,
    html,
  });
}

export async function sendRequestApprovedEmail(options: {
  toEmail: string;
  requestId: string;
  requestNumber?: number | null;
  title?: string;
}): Promise<void> {
  const { toEmail, requestId, requestNumber, title } = options;
  const displayId = requestNumber != null ? String(requestNumber).padStart(4, "0") : requestId;
  const lines: string[] = [];
  lines.push("<p>Your maintenance request has been approved.</p>");
  lines.push(`<p><strong>Request ID:</strong> ${displayId}</p>`);
  if (title) lines.push(`<p><strong>Title:</strong> ${title}</p>`);
  await sendEmail({
    to: toEmail,
    subject: `Maintenance Request Approved (#${displayId})`,
    html: lines.join(""),
  });
}

export async function sendRequestRejectedEmail(options: {
  toEmail: string;
  requestId: string;
  requestNumber?: number | null;
  title?: string;
  reason: string;
}): Promise<void> {
  const { toEmail, requestId, requestNumber, title, reason } = options;
  const displayId = requestNumber != null ? String(requestNumber).padStart(4, "0") : requestId;
  const lines: string[] = [];
  lines.push("<p>Your maintenance request has been rejected.</p>");
  lines.push(`<p><strong>Request ID:</strong> ${displayId}</p>`);
  if (title) lines.push(`<p><strong>Title:</strong> ${title}</p>`);
  lines.push("<p><strong>Reason for rejection:</strong></p>");
  lines.push(`<p>${reason || "No reason provided."}</p>`);
  await sendEmail({
    to: toEmail,
    subject: `Maintenance Request Rejected (#${displayId})`,
    html: lines.join(""),
  });
}

export async function sendWorkOrderApprovedEmail(options: {
  toEmail: string;
  workOrderId: string;
  title?: string;
}): Promise<void> {
  const { toEmail, workOrderId, title } = options;
  const lines: string[] = [];
  lines.push("<p>Your work order has been accepted and marked as completed.</p>");
  lines.push(`<p><strong>Work Order ID:</strong> ${workOrderId}</p>`);
  if (title) lines.push(`<p><strong>Title:</strong> ${title}</p>`);
  await sendEmail({
    to: toEmail,
    subject: `Work Order Accepted (#${workOrderId})`,
    html: lines.join(""),
  });
}

export async function sendWorkOrderRejectedEmail(options: {
  toEmail: string;
  workOrderId: string;
  title?: string;
  reason: string;
}): Promise<void> {
  const { toEmail, workOrderId, title, reason } = options;
  const lines: string[] = [];
  lines.push("<p>Your work order submission has been reviewed and sent back for changes.</p>");
  lines.push(`<p><strong>Work Order ID:</strong> ${workOrderId}</p>`);
  if (title) lines.push(`<p><strong>Title:</strong> ${title}</p>`);
  lines.push("<p><strong>Reason:</strong></p>");
  lines.push(`<p>${reason || "No reason provided."}</p>`);
  await sendEmail({
    to: toEmail,
    subject: `Work Order Returned for Changes (#${workOrderId})`,
    html: lines.join(""),
  });
}


