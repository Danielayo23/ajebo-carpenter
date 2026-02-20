import nodemailer from "nodemailer";

export function canSendMail() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );
}

export async function sendAdminOrderEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!canSendMail()) return;

  const port = Number(process.env.SMTP_PORT ?? "587");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM!,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}