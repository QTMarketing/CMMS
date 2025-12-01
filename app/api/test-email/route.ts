import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function GET() {
  const to = "poudelaryan46@gmail.com";
  console.log("[test-email] Attempting to send to:", to);

  try {
    await sendEmail({
      to,
      subject: "Test Email to Personal Address (Debug)",
      html: "<p>This is a test email sent directly to your personal email.</p>",
    });

    return NextResponse.json({ ok: true, to });
  } catch (err) {
    console.error("[test-email] Failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}



