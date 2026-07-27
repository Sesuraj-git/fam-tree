import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { canEditPerson } from "@/lib/permissions";
import { countBiologicalParents, hasActiveMarriage, sortSpousePair } from "@/lib/relationships";
import { createPersonSchema } from "@/lib/validation/person";
import { errorResponse, zodErrorMessage } from "@/lib/api-response";
import { getPersonById } from "@/lib/persons";
import { isUniqueViolation } from "@/lib/db-errors";

/** Creates a placeholder person and the relationship linking it to an existing person, in one call. */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return errorResponse("Not authenticated.", 401);

  const body = await request.json().catch(() => null);
  if (body === null) return errorResponse("Invalid JSON body.", 400);

  const parsed = createPersonSchema.safeParse(body);
  if (!parsed.success) return errorResponse(zodErrorMessage(parsed.error), 400);

  const {
    relation_type,
    related_to_person_id,
    relationship_type,
    status,
    start_date,
    end_date,
    ...personFields
  } = parsed.data;

  if (!(await canEditPerson(userId, related_to_person_id))) {
    return errorResponse("You do not have permission to edit this person.", 403);
  }

  const relatedPerson = await getPersonById(related_to_person_id);
  if (!relatedPerson) return errorResponse("Person not found.", 404);

  if (relation_type === "parent" && relationship_type === "biological") {
    if ((await countBiologicalParents(related_to_person_id)) >= 2) {
      return errorResponse("This person already has 2 biological parents.", 400);
    }
  }

  if (relation_type === "spouse" && status === "married") {
    if (await hasActiveMarriage(related_to_person_id)) {
      return errorResponse("This person already has an active marriage.", 400);
    }
  }

  try {
    const { person, relationship } = await db.transaction(async (trx) => {
      const [person] = await trx("persons")
        .insert({ created_by: userId, user_id: null, ...personFields })
        .returning("*");

      let relationship;
      if (relation_type === "parent") {
        [relationship] = await trx("relationships_parent_child")
          .insert({ parent_id: person.id, child_id: related_to_person_id, relationship_type })
          .returning("*");
      } else if (relation_type === "child") {
        [relationship] = await trx("relationships_parent_child")
          .insert({ parent_id: related_to_person_id, child_id: person.id, relationship_type })
          .returning("*");
      } else {
        const [person_a_id, person_b_id] = sortSpousePair(person.id, related_to_person_id);
        [relationship] = await trx("relationships_spouse")
          .insert({
            person_a_id,
            person_b_id,
            status,
            start_date: start_date ?? null,
            end_date: end_date ?? null,
          })
          .returning("*");
      }

      return { person, relationship };
    });

    return NextResponse.json({ person, relationship }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return errorResponse("This relationship already exists.", 409);
    }
    throw err;
  }
}
