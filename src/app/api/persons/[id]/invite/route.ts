import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { canEditPerson } from "@/lib/permissions";
import { getPersonById } from "@/lib/persons";
import { inviteSchema } from "@/lib/validation/auth";
import { errorResponse, zodErrorMessage } from "@/lib/api-response";
import { generateToken } from "@/lib/tokens";
import { sendClaimInviteEmail } from "@/lib/emails";

type RouteContext = { params: Promise<{ id: string }> };

/** Generates a claim token for converting a placeholder person into a real account. */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return errorResponse("Not authenticated.", 401);

  const { id } = await params;

  if (!(await canEditPerson(userId, id))) {
    return errorResponse("You do not have permission to edit this person.", 403);
  }

  const person = await getPersonById(id);
  if (!person) return errorResponse("Person not found.", 404);
  if (person.user_id) return errorResponse("This person already has an account.", 400);

  const body = await request.json().catch(() => null);
  if (body === null) return errorResponse("Invalid JSON body.", 400);

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return errorResponse(zodErrorMessage(parsed.error), 400);

  const existingAccount = await db("users").where({ email: parsed.data.email }).first("id");
  if (existingAccount) {
    return errorResponse("An account with this email already exists.", 409);
  }

  const inviter = await getCurrentUser();
  const token = generateToken();
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.transaction(async (trx) => {
    // Superseded by this new invite — an older link shouldn't remain claimable.
    await trx("account_claim_tokens")
      .where({ person_id: id })
      .whereNull("used_at")
      .update({ used_at: trx.fn.now() });

    await trx("account_claim_tokens").insert({
      person_id: id,
      token,
      email: parsed.data.email,
      expires_at,
    });
  });

  try {
    await sendClaimInviteEmail(
      parsed.data.email,
      token,
      inviter ? `${inviter.person.first_name} ${inviter.person.last_name}` : "A relative",
      person.first_name
    );
  } catch (err) {
    console.error("Failed to send claim invite email:", err);
  }

  return NextResponse.json({ success: true });
}
