import { NextRequest, NextResponse } from "next/server";
import { sendEmail, isEmailConfigured } from "@/lib/email";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const to = url.searchParams.get("to")?.trim() || "poudelaryan46@gmail.com";
  const configured = isEmailConfigured();

  console.log("[test-email] configured:", configured, "to:", to);

  if (!configured) {
    return NextResponse.json({
      ok: false,
      configured: false,
      sent: false,
      to,
      error: "No email provider configured. Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS in Vercel Environment Variables.",
    }, { status: 503 });
  }

  const result = await sendEmail({
    to,
    subject: "CMMS Test Email (Debug)",
    html: "<p>This is a test email from your CMMS app. If you received this, email is working.</p>",
  });

  return NextResponse.json({
    ok: result.sent,
    configured: true,
    sent: result.sent,
    to,
    error: result.error ?? undefined,
  }, result.sent ? { status: 200 } : { status: 500 });
}



