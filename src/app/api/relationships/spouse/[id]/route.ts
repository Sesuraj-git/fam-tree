import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { canEditPerson } from "@/lib/permissions";
import { errorResponse } from "@/lib/api-response";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return errorResponse("Not authenticated.", 401);

  const { id } = await params;

  const relationship = await db("relationships_spouse").where({ id }).first();
  if (!relationship) return errorResponse("Relationship not found.", 404);

  const canEdit =
    (await canEditPerson(userId, relationship.person_a_id)) ||
    (await canEditPerson(userId, relationship.person_b_id));
  if (!canEdit) {
    return errorResponse("You do not have permission to edit this relationship.", 403);
  }

  await db("relationships_spouse").where({ id }).del();

  return NextResponse.json({ success: true });
}
