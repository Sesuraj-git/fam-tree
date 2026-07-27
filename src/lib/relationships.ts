import "server-only";
import type { Knex } from "knex";
import type { z } from "zod";
import db from "@/lib/db";
import { getPersonById } from "@/lib/persons";
import { isUniqueViolation } from "@/lib/db-errors";
import type { attachParentSchema } from "@/lib/validation/person";

/**
 * True if `candidateAncestorId` is already an ancestor of `personId` —
 * i.e. inserting a parent_child row with parent_id = personId,
 * child_id = candidateAncestorId would close a loop. Cycles can't be
 * expressed as a SQL constraint, so callers must check this before insert.
 */
export async function isAncestorOf(
  candidateAncestorId: string,
  personId: string,
  conn: Knex = db
): Promise<boolean> {
  const result = await conn.raw(
    `
    with recursive ancestors as (
      select parent_id from relationships_parent_child where child_id = :personId
      union
      select rpc.parent_id
      from relationships_parent_child rpc
      join ancestors a on rpc.child_id = a.parent_id
    )
    select exists (select 1 from ancestors where parent_id = :candidateAncestorId) as is_ancestor
    `,
    { personId, candidateAncestorId }
  );

  return Boolean(result.rows[0]?.is_ancestor);
}

export async function countBiologicalParents(childId: string, conn: Knex = db): Promise<number> {
  const row = await conn("relationships_parent_child")
    .where({ child_id: childId, relationship_type: "biological" })
    .count<{ count: string }[]>("id as count")
    .first();
  return Number(row?.count ?? 0);
}

export async function hasActiveMarriage(personId: string, conn: Knex = db): Promise<boolean> {
  const row = await conn("relationships_spouse")
    .where("status", "married")
    .andWhere((builder) => {
      builder.where("person_a_id", personId).orWhere("person_b_id", personId);
    })
    .first("id");
  return Boolean(row);
}

/** person_a_id/person_b_id follow the a < b convention (see spouse table migration). */
export function sortSpousePair(idA: string, idB: string): [string, string] {
  return idA.toLowerCase() < idB.toLowerCase() ? [idA, idB] : [idB, idA];
}

type AttachParentOrChildInput = z.infer<typeof attachParentSchema>;

export type AttachResult =
  | { ok: true; status: 201; person: Record<string, unknown>; relationship: Record<string, unknown> }
  | { ok: false; status: number; message: string };

/**
 * Shared by POST /api/persons/:id/parents and POST /api/persons/:id/children —
 * the two are mirror images of each other, differing only in which side of
 * the parent_child edge `targetPersonId` sits on.
 */
export async function attachParentOrChild(
  direction: "parent" | "child",
  targetPersonId: string,
  userId: string,
  input: AttachParentOrChildInput
): Promise<AttachResult> {
  const { existing_person_id, relationship_type, ...personFields } = input;

  if (existing_person_id) {
    if (existing_person_id === targetPersonId) {
      return { ok: false, status: 400, message: "A person cannot be their own parent or child." };
    }

    const other = await getPersonById(existing_person_id);
    if (!other) {
      return { ok: false, status: 404, message: "The referenced person was not found." };
    }

    const parentId = direction === "parent" ? existing_person_id : targetPersonId;
    const childId = direction === "parent" ? targetPersonId : existing_person_id;

    if (relationship_type === "biological" && (await countBiologicalParents(childId)) >= 2) {
      return { ok: false, status: 400, message: "This person already has 2 biological parents." };
    }

    // Adding parentId -> childId would close a loop iff childId is already an ancestor of parentId.
    if (await isAncestorOf(childId, parentId)) {
      return { ok: false, status: 400, message: "This would create a cycle in the family tree." };
    }

    try {
      const [relationship] = await db("relationships_parent_child")
        .insert({ parent_id: parentId, child_id: childId, relationship_type })
        .returning("*");
      return { ok: true, status: 201, person: other, relationship };
    } catch (err) {
      if (isUniqueViolation(err)) {
        return { ok: false, status: 409, message: "This parent/child relationship already exists." };
      }
      throw err;
    }
  }

  // Brand-new placeholder person — no cycle is possible against a node that doesn't exist yet.
  if (direction === "parent" && relationship_type === "biological") {
    if ((await countBiologicalParents(targetPersonId)) >= 2) {
      return { ok: false, status: 400, message: "This person already has 2 biological parents." };
    }
  }

  const { person, relationship } = await db.transaction(async (trx) => {
    const [person] = await trx("persons")
      .insert({ created_by: userId, user_id: null, ...personFields })
      .returning("*");

    const [parent_id, child_id] =
      direction === "parent" ? [person.id, targetPersonId] : [targetPersonId, person.id];

    const [relationship] = await trx("relationships_parent_child")
      .insert({ parent_id, child_id, relationship_type })
      .returning("*");

    return { person, relationship };
  });

  return { ok: true, status: 201, person, relationship };
}
