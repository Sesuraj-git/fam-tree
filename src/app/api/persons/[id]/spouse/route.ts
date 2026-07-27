import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { canEditPerson } from "@/lib/permissions";
import { getPersonById } from "@/lib/persons";
import { attachSpouseSchema } from "@/lib/validation/person";
import { hasActiveMarriage, sortSpousePair } from "@/lib/relationships";
import { errorResponse, zodErrorMessage } from "@/lib/api-response";
import { isUniqueViolation } from "@/lib/db-errors";

type RouteContext = { params: Promise<{ id: string }> };

/** Attaches an existing person as a spouse, or creates a new placeholder spouse. */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return errorResponse("Not authenticated.", 401);

  const { id } = await params;

  if (!(await canEditPerson(userId, id))) {
    return errorResponse("You do not have permission to edit this person.", 403);
  }

  const target = await getPersonById(id);
  if (!target) return errorResponse("Person not found.", 404);

  const body = await request.json().catch(() => null);
  if (body === null) return errorResponse("Invalid JSON body.", 400);

  const parsed = attachSpouseSchema.safeParse(body);
  if (!parsed.success) return errorResponse(zodErrorMessage(parsed.error), 400);

  const { existing_person_id, status, start_date, end_date, ...personFields } = parsed.data;

  if (status === "married" && (await hasActiveMarriage(id))) {
    return errorResponse("This person already has an active marriage.", 400);
  }

  if (existing_person_id) {
    if (existing_person_id === id) {
      return errorResponse("A person cannot be their own spouse.", 400);
    }

    const other = await getPersonById(existing_person_id);
    if (!other) return errorResponse("The referenced person was not found.", 404);

    if (status === "married" && (await hasActiveMarriage(existing_person_id))) {
      return errorResponse("The other person already has an active marriage.", 400);
    }

    const [person_a_id, person_b_id] = sortSpousePair(id, existing_person_id);

    try {
      const [relationship] = await db("relationships_spouse")
        .insert({
          person_a_id,
          person_b_id,
          status,
          start_date: start_date ?? null,
          end_date: end_date ?? null,
        })
        .returning("*");
      return NextResponse.json({ person: other, relationship }, { status: 201 });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return errorResponse("This spousal relationship already exists.", 409);
      }
      throw err;
    }
  }

  const { person, relationship } = await db.transaction(async (trx) => {
    const [person] = await trx("persons")
      .insert({ created_by: userId, user_id: null, ...personFields })
      .returning("*");

    const [person_a_id, person_b_id] = sortSpousePair(id, person.id);
    const [relationship] = await trx("relationships_spouse")
      .insert({
        person_a_id,
        person_b_id,
        status,
        start_date: start_date ?? null,
        end_date: end_date ?? null,
      })
      .returning("*");

    return { person, relationship };
  });

  return NextResponse.json({ person, relationship }, { status: 201 });
}
