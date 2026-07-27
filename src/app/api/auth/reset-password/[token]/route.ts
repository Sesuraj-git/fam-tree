import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { errorResponse, zodErrorMessage } from "@/lib/api-response";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  const body = await request.json().catch(() => null);
  if (body === null) return errorResponse("Invalid JSON body.", 400);

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return errorResponse(zodErrorMessage(parsed.error), 400);

  const resetToken = await db("password_reset_tokens")
    .where({ token })
    .whereNull("used_at")
    .where("expires_at", ">", db.fn.now())
    .first();

  if (!resetToken) {
    return errorResponse("This password reset link is invalid or has expired.", 400);
  }

  const password_hash = await hashPassword(parsed.data.password);

  await db.transaction(async (trx) => {
    await trx("users")
      .where({ id: resetToken.user_id })
      .update({ password_hash, updated_at: trx.fn.now() });
    await trx("password_reset_tokens").where({ id: resetToken.id }).update({ used_at: trx.fn.now() });
  });

  return NextResponse.json({ success: true });
}
