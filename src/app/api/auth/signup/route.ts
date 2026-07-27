import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { signupSchema } from "@/lib/validation/auth";
import { errorResponse, zodErrorMessage } from "@/lib/api-response";

/** Signup creates a `users` row and a linked `persons` row in one step — this person is "myself" in the tree. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return errorResponse("Invalid JSON body.", 400);
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(zodErrorMessage(parsed.error), 400);
  }

  const { email, password, first_name, last_name, gender, date_of_birth } = parsed.data;

  const existing = await db("users").where({ email }).first("id");
  if (existing) {
    return errorResponse("An account with this email already exists.", 409);
  }

  const password_hash = await hashPassword(password);

  const { user, person } = await db.transaction(async (trx) => {
    const [user] = await trx("users")
      .insert({ email, password_hash })
      .returning(["id", "email"]);

    const [person] = await trx("persons")
      .insert({
        user_id: user.id,
        created_by: user.id,
        first_name,
        last_name,
        gender,
        date_of_birth: date_of_birth ?? null,
      })
      .returning(["id", "first_name", "last_name", "gender", "date_of_birth"]);

    return { user, person };
  });

  await createSession(user.id);

  return NextResponse.json({ user, person }, { status: 201 });
}
