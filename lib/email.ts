import nodemailer from "nodemailer";

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

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  if (!transporter || !smtpEnabled) {
    console.warn("[email] SMTP not fully configured, skipping email send");
    return;
  }

  try {
    await transporter.sendMail({
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


