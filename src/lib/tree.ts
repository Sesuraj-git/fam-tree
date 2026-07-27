import "server-only";
import type { Knex } from "knex";
import db from "@/lib/db";
import type { PersonRow } from "@/lib/persons";

/**
 * Recursive-CTE counts instead of walking in JS. Plain UNION (not UNION ALL)
 * deduplicates visited nodes, which also makes this safe against a cycle
 * slipping through despite the app-level guard in relationships.ts.
 */
export async function getDescendantCount(personId: string, conn: Knex = db): Promise<number> {
  const result = await conn.raw(
    `
    with recursive descendants as (
      select child_id from relationships_parent_child where parent_id = :personId
      union
      select rpc.child_id
      from relationships_parent_child rpc
      join descendants d on rpc.parent_id = d.child_id
    )
    select count(distinct child_id)::int as count from descendants
    `,
    { personId }
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function getAncestorCount(personId: string, conn: Knex = db): Promise<number> {
  const result = await conn.raw(
    `
    with recursive ancestors as (
      select parent_id from relationships_parent_child where child_id = :personId
      union
      select rpc.parent_id
      from relationships_parent_child rpc
      join ancestors a on rpc.child_id = a.parent_id
    )
    select count(distinct parent_id)::int as count from ancestors
    `,
    { personId }
  );
  return Number(result.rows[0]?.count ?? 0);
}

export type TreeDirection = "ancestors" | "descendants" | "both";

export type TreeNode = {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  is_alive: boolean;
  has_account: boolean;
  avatar_url: string | null;
  // Immediate (one-hop) degree, not the full recursive count — lets the
  // frontend compute "+N" against whatever it's already merged client-side.
  parents_count: number;
  children_count: number;
  // Convenience flags for THIS response only: true if this node's parents/
  // children aren't fully included in the graph returned right now.
  has_more_parents: boolean;
  has_more_children: boolean;
};

export type ParentChildEdge = {
  id: string;
  parent_id: string;
  child_id: string;
  relationship_type: string;
};

export type SpouseEdge = {
  id: string;
  person_a_id: string;
  person_b_id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

export type TreeGraph = {
  nodes: TreeNode[];
  parent_child_edges: ParentChildEdge[];
  spouse_edges: SpouseEdge[];
};

/**
 * BFS out from `personId` up to `depth` levels (parents and/or children),
 * then adds spouses of every node reached along the way as terminal
 * "beside them" companions (not further expanded — matches the tree UI,
 * which always shows a person's spouse next to them without pulling in
 * the spouse's own ancestors/descendants until the user expands that node).
 */
export async function getTreeSubgraph(
  personId: string,
  depth: number,
  direction: TreeDirection
): Promise<TreeGraph | null> {
  const center = await db("persons").where({ id: personId }).whereNull("deleted_at").first("id");
  if (!center) return null;

  const nodeIds = new Set<string>([personId]);
  const parentChildEdgeMap = new Map<string, ParentChildEdge>();

  async function expand(frontierColumn: "parent_id" | "child_id", otherColumn: "child_id" | "parent_id") {
    let frontier = [personId];
    for (let level = 0; level < depth && frontier.length > 0; level++) {
      const rows = await db<ParentChildEdge>("relationships_parent_child").whereIn(frontierColumn, frontier);
      const nextFrontier: string[] = [];
      for (const row of rows) {
        parentChildEdgeMap.set(row.id, row);
        const otherId = row[otherColumn];
        if (!nodeIds.has(otherId)) {
          nodeIds.add(otherId);
          nextFrontier.push(otherId);
        }
      }
      frontier = nextFrontier;
    }
  }

  if (direction === "ancestors" || direction === "both") {
    await expand("child_id", "parent_id");
  }
  if (direction === "descendants" || direction === "both") {
    await expand("parent_id", "child_id");
  }

  const spouseEdgeMap = new Map<string, SpouseEdge>();
  const idsBeforeSpouses = Array.from(nodeIds);
  const spouseRows = await db<SpouseEdge>("relationships_spouse")
    .whereIn("person_a_id", idsBeforeSpouses)
    .orWhereIn("person_b_id", idsBeforeSpouses);
  for (const row of spouseRows) {
    spouseEdgeMap.set(row.id, row);
    nodeIds.add(row.person_a_id);
    nodeIds.add(row.person_b_id);
  }

  const allIds = Array.from(nodeIds);
  const persons = await db<PersonRow>("persons").whereIn("id", allIds).whereNull("deleted_at");

  const [childrenCountRows, parentsCountRows] = await Promise.all([
    db("relationships_parent_child")
      .whereIn("parent_id", allIds)
      .groupBy("parent_id")
      .select("parent_id")
      .count<{ parent_id: string; count: string }[]>("id as count"),
    db("relationships_parent_child")
      .whereIn("child_id", allIds)
      .groupBy("child_id")
      .select("child_id")
      .count<{ child_id: string; count: string }[]>("id as count"),
  ]);
  const childrenCountByParent = new Map(childrenCountRows.map((r) => [r.parent_id, Number(r.count)]));
  const parentsCountByChild = new Map(parentsCountRows.map((r) => [r.child_id, Number(r.count)]));

  const includedChildrenByParent = new Map<string, number>();
  const includedParentsByChild = new Map<string, number>();
  for (const edge of parentChildEdgeMap.values()) {
    includedChildrenByParent.set(edge.parent_id, (includedChildrenByParent.get(edge.parent_id) ?? 0) + 1);
    includedParentsByChild.set(edge.child_id, (includedParentsByChild.get(edge.child_id) ?? 0) + 1);
  }

  const nodes: TreeNode[] = persons.map((p) => {
    const parentsTotal = parentsCountByChild.get(p.id) ?? 0;
    const childrenTotal = childrenCountByParent.get(p.id) ?? 0;
    return {
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      gender: p.gender,
      is_alive: p.is_alive,
      has_account: p.user_id !== null,
      avatar_url: p.avatar_url,
      parents_count: parentsTotal,
      children_count: childrenTotal,
      has_more_parents: parentsTotal > (includedParentsByChild.get(p.id) ?? 0),
      has_more_children: childrenTotal > (includedChildrenByParent.get(p.id) ?? 0),
    };
  });

  return {
    nodes,
    parent_child_edges: Array.from(parentChildEdgeMap.values()),
    spouse_edges: Array.from(spouseEdgeMap.values()),
  };
}
