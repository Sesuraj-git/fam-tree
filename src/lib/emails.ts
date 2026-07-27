import "server-only";
import { sendMail } from "@/lib/mail";

function appUrl(path: string) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

export async function sendClaimInviteEmail(
  to: string,
  token: string,
  inviterName: string,
  personFirstName: string
) {
  const url = appUrl(`/claim/${token}`);
  await sendMail(
    to,
    `${inviterName} invited you to your family tree`,
    `
    <p>${inviterName} added you (${personFirstName}) to a family tree and would like you to claim your profile.</p>
    <p><a href="${url}">Click here to set your password and claim your profile</a></p>
    <p>This link expires in 7 days. If you weren't expecting this, you can ignore this email.</p>
    `
  );
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = appUrl(`/reset-password/${token}`);
  await sendMail(
    to,
    "Reset your password",
    `
    <p>We received a request to reset your password.</p>
    <p><a href="${url}">Click here to choose a new password</a></p>
    <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `
  );
}
