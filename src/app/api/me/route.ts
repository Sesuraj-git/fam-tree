import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api-response";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return errorResponse("Not authenticated.", 401);
  }
  return NextResponse.json(currentUser);
}
