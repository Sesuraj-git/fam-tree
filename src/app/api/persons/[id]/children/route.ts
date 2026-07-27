import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { canEditPerson } from "@/lib/permissions";
import { getPersonById } from "@/lib/persons";
import { attachChildSchema } from "@/lib/validation/person";
import { attachParentOrChild } from "@/lib/relationships";
import { errorResponse, zodErrorMessage } from "@/lib/api-response";

type RouteContext = { params: Promise<{ id: string }> };

/** Attaches an existing person as a child, or creates a new placeholder child. */
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

  const parsed = attachChildSchema.safeParse(body);
  if (!parsed.success) return errorResponse(zodErrorMessage(parsed.error), 400);

  const result = await attachParentOrChild("child", id, userId, parsed.data);
  if (!result.ok) return errorResponse(result.message, result.status);

  return NextResponse.json(
    { person: result.person, relationship: result.relationship },
    { status: result.status }
  );
}
