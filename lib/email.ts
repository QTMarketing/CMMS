import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM =
  process.env.EMAIL_FROM || "QuickTrack CMMS <aryan.poudel@quicktrackinc.com>";

const resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!RESEND_API_KEY || !resendClient) {
    console.warn("[email] RESEND_API_KEY not set, skipping email send");
    return;
  }

  try {
    await resendClient.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("[email] Failed to send email", error);
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
}): Promise<void> {
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

  const html = lines.join("");

  await sendEmail({
    to: technicianEmail,
    subject: `New Work Order Assigned (#${workOrderId})`,
    html,
  });
}

export async function sendRequestSubmittedEmail(options: {
  storeAdminEmail: string;
  requesterName?: string;
  storeName?: string;
  requestId: string;
  summary?: string;
}): Promise<void> {
  const { storeAdminEmail, requesterName, storeName, requestId, summary } =
    options;

  const lines: string[] = [];

  lines.push("<p>A new maintenance request has been submitted.</p>");
  lines.push(`<p><strong>Request ID:</strong> ${requestId}</p>`);

  if (requesterName) {
    lines.push(`<p><strong>Requester:</strong> ${requesterName}</p>`);
  }

  if (storeName) {
    lines.push(`<p><strong>Store:</strong> ${storeName}</p>`);
  }

  if (summary) {
    lines.push(`<p><strong>Summary:</strong> ${summary}</p>`);
  }

  const html = lines.join("");

  await sendEmail({
    to: storeAdminEmail,
    subject: `New Maintenance Request (#${requestId})`,
    html,
  });
}


