import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation/auth";
import { errorResponse, zodErrorMessage } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return errorResponse("Invalid JSON body.", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(zodErrorMessage(parsed.error), 400);
  }

  const { email, password } = parsed.data;

  const user = await db("users").where({ email }).first("id", "email", "password_hash");
  // Same generic message for unknown email vs. wrong password — don't leak which one was wrong.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return errorResponse("Invalid email or password.", 401);
  }

  await createSession(user.id);

  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
