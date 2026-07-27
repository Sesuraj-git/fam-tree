import "server-only";
import db from "@/lib/db";
import { getDescendantCount, getAncestorCount } from "@/lib/tree";

export type PersonRow = {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  gender: "male" | "female" | "other" | "unknown";
  date_of_birth: string | null;
  date_of_death: string | null;
  is_alive: boolean;
  avatar_url: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PersonSummary = {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  is_alive: boolean;
  has_account: boolean;
  avatar_url: string | null;
};

function toSummary(row: PersonRow): PersonSummary {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    gender: row.gender,
    is_alive: row.is_alive,
    has_account: row.user_id !== null,
    avatar_url: row.avatar_url,
  };
}

export async function getPersonById(id: string): Promise<PersonRow | undefined> {
  return db<PersonRow>("persons").where({ id }).whereNull("deleted_at").first();
}

export async function getPersonDetail(id: string) {
  const person = await getPersonById(id);
  if (!person) return null;

  const parentRows = await db("relationships_parent_child as rpc")
    .join("persons as p", "p.id", "rpc.parent_id")
    .where("rpc.child_id", id)
    .whereNull("p.deleted_at")
    .select<(PersonRow & { relationship_id: string; relationship_type: string })[]>(
      "p.*",
      "rpc.id as relationship_id",
      "rpc.relationship_type"
    );

  const childRows = await db("relationships_parent_child as rpc")
    .join("persons as p", "p.id", "rpc.child_id")
    .where("rpc.parent_id", id)
    .whereNull("p.deleted_at")
    .select<(PersonRow & { relationship_id: string; relationship_type: string })[]>(
      "p.*",
      "rpc.id as relationship_id",
      "rpc.relationship_type"
    );

  const spouseLinkRows = await db<{
    id: string;
    person_a_id: string;
    person_b_id: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
  }>("relationships_spouse")
    .where("person_a_id", id)
    .orWhere("person_b_id", id)
    .select("id", "person_a_id", "person_b_id", "status", "start_date", "end_date");

  const spousePersonIds = spouseLinkRows.map((r) =>
    r.person_a_id === id ? r.person_b_id : r.person_a_id
  );
  const spousePersons = spousePersonIds.length
    ? await db<PersonRow>("persons").whereIn("id", spousePersonIds).whereNull("deleted_at")
    : [];
  const spousePersonById = new Map(spousePersons.map((p) => [p.id, p]));

  const spouses = spouseLinkRows.flatMap((r) => {
    const otherId = r.person_a_id === id ? r.person_b_id : r.person_a_id;
    const otherPerson = spousePersonById.get(otherId);
    if (!otherPerson) return [];
    return [
      {
        ...toSummary(otherPerson),
        relationship_id: r.id,
        status: r.status,
        start_date: r.start_date,
        end_date: r.end_date,
      },
    ];
  });

  const [descendant_count, ancestor_count] = await Promise.all([
    getDescendantCount(id),
    getAncestorCount(id),
  ]);

  return {
    id: person.id,
    first_name: person.first_name,
    last_name: person.last_name,
    gender: person.gender,
    date_of_birth: person.date_of_birth,
    date_of_death: person.date_of_death,
    is_alive: person.is_alive,
    avatar_url: person.avatar_url,
    notes: person.notes,
    has_account: person.user_id !== null,
    created_by: person.created_by,
    parents: parentRows.map((r) => ({
      ...toSummary(r),
      relationship_id: r.relationship_id,
      relationship_type: r.relationship_type,
    })),
    children: childRows.map((r) => ({
      ...toSummary(r),
      relationship_id: r.relationship_id,
      relationship_type: r.relationship_type,
    })),
    spouses,
    descendant_count,
    ancestor_count,
  };
}
