import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { getTreeSubgraph, type TreeDirection } from "@/lib/tree";
import { errorResponse } from "@/lib/api-response";

type RouteContext = { params: Promise<{ personId: string }> };

const DIRECTIONS = new Set<TreeDirection>(["ancestors", "descendants", "both"]);

export async function GET(request: NextRequest, { params }: RouteContext) {
  const userId = await getSessionUserId();
  if (!userId) return errorResponse("Not authenticated.", 401);

  const { personId } = await params;
  const { searchParams } = new URL(request.url);

  const depthParam = searchParams.get("depth");
  const depth = depthParam === null ? 2 : Number(depthParam);
  if (!Number.isInteger(depth) || depth < 1 || depth > 10) {
    return errorResponse("depth must be an integer between 1 and 10.", 400);
  }

  const directionParam = searchParams.get("direction") ?? "both";
  if (!DIRECTIONS.has(directionParam as TreeDirection)) {
    return errorResponse("direction must be one of: ancestors, descendants, both.", 400);
  }

  const graph = await getTreeSubgraph(personId, depth, directionParam as TreeDirection);
  if (!graph) return errorResponse("Person not found.", 404);

  return NextResponse.json({ center_id: personId, ...graph });
}
