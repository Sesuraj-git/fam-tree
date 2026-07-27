import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { errorResponse, zodErrorMessage } from "@/lib/api-response";
import { generateToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/emails";

const GENERIC_MESSAGE =
  "If an account with that email exists, a password reset link has been sent.";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (body === null) return errorResponse("Invalid JSON body.", 400);

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return errorResponse(zodErrorMessage(parsed.error), 400);

  const { email } = parsed.data;
  const user = await db("users").where({ email }).first("id", "email");

  // Always the same response, whether or not the email is registered — avoids leaking which emails have accounts.
  if (user) {
    const token = generateToken();
    const expires_at = new Date(Date.now() + 60 * 60 * 1000);
    await db("password_reset_tokens").insert({ user_id: user.id, token, expires_at });

    try {
      await sendPasswordResetEmail(user.email, token);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
