import "server-only";
import type { Knex } from "knex";
import db from "@/lib/db";

/**
 * v1 permission rule (deliberately simple, not a full recursive tree
 * closure): a user can edit a person if that person is
 *   1. themselves,
 *   2. someone they personally added (`created_by`), or
 *   3. a direct parent/child/spouse of (1) or (2).
 * This is a bounded, single-hop expansion — it does NOT recursively chase
 * "family of family of family", which would silently grant edit rights
 * over an entire connected tree and defeat the point of a permission check.
 */
export async function canEditPerson(
  userId: string,
  personId: string,
  conn: Knex = db
): Promise<boolean> {
  const result = await conn.raw(
    `
    with my_scope as (
      select id from persons where created_by = :userId and deleted_at is null
      union
      select id from persons where user_id = :userId and deleted_at is null
    )
    select exists (
      select 1 from my_scope where id = :personId
      union
      select 1 from relationships_parent_child rpc
        where (rpc.parent_id = :personId and rpc.child_id in (select id from my_scope))
           or (rpc.child_id = :personId and rpc.parent_id in (select id from my_scope))
      union
      select 1 from relationships_spouse rs
        where (rs.person_a_id = :personId and rs.person_b_id in (select id from my_scope))
           or (rs.person_b_id = :personId and rs.person_a_id in (select id from my_scope))
    ) as can_edit
    `,
    { userId, personId }
  );

  return Boolean(result.rows[0]?.can_edit);
}
