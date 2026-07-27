import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** First issue's message from a failed zod safeParse, for a friendly single-line error. */
export function zodErrorMessage(error: ZodError) {
  return error.issues[0]?.message ?? "Invalid request body";
}
