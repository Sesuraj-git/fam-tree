import "server-only";
import { cache } from "react";
import bcrypt from "bcrypt";
import db from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export type CurrentUser = {
  id: string;
  email: string;
  person: {
    id: string;
    first_name: string;
    last_name: string;
    gender: string;
    date_of_birth: string | null;
    date_of_death: string | null;
    is_alive: boolean;
    avatar_url: string | null;
    notes: string | null;
  };
};

/**
 * Returns the logged-in user + their own person record, or null if unauthenticated.
 * Wrapped in React's cache() so the layout and page in the same request share one query.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const row = await db("users")
    .join("persons", "persons.user_id", "users.id")
    .where("users.id", userId)
    .first(
      "users.id as id",
      "users.email as email",
      "persons.id as person_id",
      "persons.first_name",
      "persons.last_name",
      "persons.gender",
      "persons.date_of_birth",
      "persons.date_of_death",
      "persons.is_alive",
      "persons.avatar_url",
      "persons.notes"
    );

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    person: {
      id: row.person_id,
      first_name: row.first_name,
      last_name: row.last_name,
      gender: row.gender,
      date_of_birth: row.date_of_birth,
      date_of_death: row.date_of_death,
      is_alive: row.is_alive,
      avatar_url: row.avatar_url,
      notes: row.notes,
    },
  };
});
