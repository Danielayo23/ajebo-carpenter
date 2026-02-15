import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

type Body = {
  name?: string;
  email?: string;
  message?: string;
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  const to = process.env.CONTACT_TO_EMAIL || "info@ajebocarpenter.com";
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // This "from" MUST be a real mailbox on your domain or your SMTP provider
  // (don’t use the visitor’s email as the from address — it often gets blocked)
  const from = process.env.CONTACT_FROM_EMAIL || "no-reply@ajebocarpenter.com";

  if (!host || !user || !pass) {
    return json(
      {
        message:
          "Email service is not configured. Missing SMTP_HOST / SMTP_USER / SMTP_PASS.",
      },
      { status: 500 }
    );
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const message = String(body?.message ?? "").trim();

  if (!name || !email || !message) {
    return json({ message: "Missing name, email, or message." }, { status: 400 });
  }

  if (!isEmail(email)) {
    return json({ message: "Invalid email address." }, { status: 400 });
  }

  // Basic anti-abuse
  if (message.length > 5000) {
    return json({ message: "Message too long." }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: { user, pass },
  });

  const subject = `New Contact Message — Ajebo Carpenter (${name})`;

  const text = `
New contact form submission:

Name: ${name}
Email: ${email}

Message:
${message}
`.trim();

  const html = `
  <div style="font-family: Arial, sans-serif; line-height:1.5;">
    <h2>New contact form submission</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong></p>
    <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px;">${escapeHtml(
      message
    )}</pre>
  </div>
  `;

  try {
    await transporter.sendMail({
      from,                 // your mailbox (important)
      to,                   // info@ajebocarpenter.com
      replyTo: email,       // so you can reply to the customer
      subject,
      text,
      html,
    });

    return json({ ok: true });
  } catch (err) {
    return json(
      { message: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
