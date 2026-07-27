import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST ?? "smtp.zoho.com";
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be set to send email.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // Zoho: 465 = SSL, 587 = STARTTLS
    auth: { user, pass },
  });

  return transporter;
}

export async function sendMail(to: string, subject: string, html: string) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await getTransporter().sendMail({ from, to, subject, html });
}
