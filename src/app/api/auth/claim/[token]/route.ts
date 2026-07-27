import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { claimSchema } from "@/lib/validation/auth";
import { errorResponse, zodErrorMessage } from "@/lib/api-response";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * Completes the placeholder-person -> real-account conversion. The person's
 * `id` never changes, so every relationship row referencing them stays valid.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  const body = await request.json().catch(() => null);
  if (body === null) return errorResponse("Invalid JSON body.", 400);

  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) return errorResponse(zodErrorMessage(parsed.error), 400);

  const claimToken = await db("account_claim_tokens")
    .where({ token })
    .whereNull("used_at")
    .where("expires_at", ">", db.fn.now())
    .first();

  if (!claimToken) {
    return errorResponse("This invite link is invalid or has expired.", 400);
  }

  const person = await db("persons")
    .where({ id: claimToken.person_id })
    .whereNull("deleted_at")
    .first();
  if (!person) return errorResponse("The invited person could not be found.", 404);
  if (person.user_id) return errorResponse("This person has already claimed an account.", 400);

  const existingAccount = await db("users").where({ email: claimToken.email }).first("id");
  if (existingAccount) {
    return errorResponse("An account with this email already exists.", 409);
  }

  const password_hash = await hashPassword(parsed.data.password);

  const user = await db.transaction(async (trx) => {
    const [user] = await trx("users")
      .insert({ email: claimToken.email, password_hash })
      .returning(["id", "email"]);

    await trx("persons")
      .where({ id: person.id })
      .update({ user_id: user.id, updated_at: trx.fn.now() });
    await trx("account_claim_tokens").where({ id: claimToken.id }).update({ used_at: trx.fn.now() });

    return user;
  });

  await createSession(user.id);

  return NextResponse.json({
    user,
    person: { id: person.id, first_name: person.first_name, last_name: person.last_name },
  });
}
