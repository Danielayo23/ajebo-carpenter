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
    const fromEmail = String(form.get("fromEmail") ?? "").trim();

    if (!productName || !productSlug) {
      return json({ ok: false, message: "Missing product info" }, { status: 400 });
    }

    const file = form.get("images");
    let attachment:
      | { filename: string; content: Buffer; contentType?: string }
      | undefined;

    if (file instanceof File && file.size > 0) {
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

    if (!note && !attachment) {
      return json(
        { ok: false, message: "Please type a note or upload an image." },
        { status: 400 }
      );
    }

    const host = process.env.SMTP_HOST;
    const port = toNumber(process.env.SMTP_PORT, 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;
    const to = process.env.CONTACT_TO || user;

    if (!host || !user || !pass || !from) {
      return json(
        { ok: false, message: "Missing SMTP environment variables." },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const productUrl = `${appUrl}/products/${encodeURIComponent(productSlug)}`;

    await transporter.sendMail({
      from,
      to,
      replyTo: fromEmail || undefined,
      subject: `Custom request: ${productName}`,
      text: `
Product: ${productName}
Link: ${productUrl}
Customer Email: ${fromEmail || "(not provided)"}

Note:
${note}
      `.trim(),
      attachments: attachment ? [attachment] : undefined,
    });

    return json({ ok: true });
  } catch (err: any) {
    console.error("PRODUCT_NOTE_EMAIL_ERROR:", err);
    return json(
      { ok: false, message: "Failed to send message.", error: err?.message },
      { status: 500 }
    );
  }
}