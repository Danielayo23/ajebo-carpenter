import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

function toNumber(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const productName = String(form.get("productName") ?? "").trim();
    const productSlug = String(form.get("productSlug") ?? "").trim();
    const note = String(form.get("note") ?? "").trim();
    const fromEmail = String(form.get("fromEmail") ?? "").trim(); // optional

    if (!productName || !productSlug) {
      return json({ ok: false, message: "Missing product info" }, { status: 400 });
    }

    const file = form.getAll("images");
    const hasImage = file && file instanceof File && file.size > 0;

    if (!note && !hasImage) {
      return json({ ok: false, message: "Please type a note or upload an image." }, { status: 400 });
    }
    // Optional image
    let attachment:
      | { filename: string; content: Buffer; contentType?: string }
      | undefined;

    if (file && file instanceof File && file.size > 0) {
      
      // 5MB limit (adjust if you want)
      const MAX = 5 * 1024 * 1024;
      if (file.size > MAX) {
        return json({ ok: false, message: "Image too large (max 5MB)." }, { status: 413 });
      }

      const arrayBuf = await file.arrayBuffer();
      attachment = {
        filename: file.name || "upload",
        content: Buffer.from(arrayBuf),
        contentType: file.type || undefined,
      };
    }

    // SMTP env vars (Namecheap / PrivateEmail usually works with mail.privateemail.com)
    const host = process.env.SMTP_HOST;
    const port = toNumber(process.env.SMTP_PORT, 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    const to = process.env.CONTACT_TO || "info@ajebocarpenter.com";
    const from = process.env.SMTP_FROM || user; // e.g. info@ajebocarpenter.com

    if (!host || !user || !pass || !from) {
      return json(
        { ok: false, message: "Missing SMTP env vars (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM)" },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = SSL, 587 = STARTTLS
      auth: { user, pass },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const productUrl = `${appUrl}/products/${encodeURIComponent(productSlug)}`;

    const subject = `Custom request: ${productName}`;
    const text = [
      `Product: ${productName}`,
      `Link: ${productUrl}`,
      fromEmail ? `Customer email: ${fromEmail}` : `Customer email: (not provided)`,
      ``,
      `Note:`,
      note,
    ].join("\n");

    await transporter.sendMail({
      from,
      to,
      subject,
      replyTo: fromEmail || undefined,
      text,
      attachments: attachment ? [attachment] : undefined,
    });

    return json({ ok: true });
  } catch (err: any) {
    return json(
      { ok: false, message: "Failed to send message", error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
