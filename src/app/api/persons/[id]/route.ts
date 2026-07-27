import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { canEditPerson } from "@/lib/permissions";
import { getPersonById, getPersonDetail } from "@/lib/persons";
import { patchPersonSchema, deletePersonSchema } from "@/lib/validation/person";
import { errorResponse, zodErrorMessage } from "@/lib/api-response";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return errorResponse("Not authenticated.", 401);

  const { id } = await params;
  const detail = await getPersonDetail(id);
  if (!detail) return errorResponse("Person not found.", 404);

  return NextResponse.json(detail);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return errorResponse("Not authenticated.", 401);

  const { id } = await params;

  if (!(await canEditPerson(userId, id))) {
    return errorResponse("You do not have permission to edit this person.", 403);
  }

  const existing = await getPersonById(id);
  if (!existing) return errorResponse("Person not found.", 404);

  const body = await request.json().catch(() => null);
  if (body === null) return errorResponse("Invalid JSON body.", 400);

  const parsed = patchPersonSchema.safeParse(body);
  if (!parsed.success) return errorResponse(zodErrorMessage(parsed.error), 400);

  const updates: Record<string, unknown> = { ...parsed.data };
  // If death date is being set and the caller didn't say otherwise, they've died.
  if (updates.date_of_death && parsed.data.is_alive === undefined) {
    updates.is_alive = false;
  }

  const [updated] = await db("persons")
    .where({ id })
    .whereNull("deleted_at")
    .update({ ...updates, updated_at: db.fn.now() })
    .returning("*");

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return errorResponse("Not authenticated.", 401);

  const { id } = await params;

  if (!(await canEditPerson(userId, id))) {
    return errorResponse("You do not have permission to edit this person.", 403);
  }

  const existing = await getPersonById(id);
  if (!existing) return errorResponse("Person not found.", 404);

  const body = await request.json().catch(() => ({}));
  const parsed = deletePersonSchema.safeParse(body ?? {});
  if (!parsed.success) return errorResponse(zodErrorMessage(parsed.error), 400);
  const { confirm } = parsed.data;

  const [{ count: childrenCount }] = await db("relationships_parent_child")
    .where({ parent_id: id })
    .count<{ count: string }[]>("id as count");
  const [{ count: spouseCount }] = await db("relationships_spouse")
    .where("person_a_id", id)
    .orWhere("person_b_id", id)
    .count<{ count: string }[]>("id as count");

  const hasDependents = Number(childrenCount) > 0 || Number(spouseCount) > 0;

  if (hasDependents && !confirm) {
    return errorResponse(
      `This person has ${childrenCount} child relationship(s) and ${spouseCount} spouse relationship(s). ` +
        "Deleting is a soft-delete: their children and spouse links are not removed or reassigned. " +
        "Pass { \"confirm\": true } to proceed.",
      409
    );
  }

  await db("persons").where({ id }).update({ deleted_at: db.fn.now() });

  return NextResponse.json({ success: true });
}
