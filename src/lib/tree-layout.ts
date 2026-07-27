import type { TreeNode, ParentChildEdge, SpouseEdge } from "@/lib/types";

export const NODE_WIDTH = 168;
export const NODE_HEIGHT = 72;
export const COLUMN_SPACING = 208;
export const ROW_SPACING = 160;
export const SPOUSE_GAP = 24;

export type GraphState = {
  nodes: Map<string, TreeNode>;
  parentChildEdges: Map<string, ParentChildEdge>;
  spouseEdges: Map<string, SpouseEdge>;
};

export function emptyGraph(): GraphState {
  return { nodes: new Map(), parentChildEdges: new Map(), spouseEdges: new Map() };
}

export function mergeGraph(prev: GraphState, incoming: {
  nodes: TreeNode[];
  parent_child_edges: ParentChildEdge[];
  spouse_edges: SpouseEdge[];
}): GraphState {
  const nodes = new Map(prev.nodes);
  const parentChildEdges = new Map(prev.parentChildEdges);
  const spouseEdges = new Map(prev.spouseEdges);

  for (const node of incoming.nodes) nodes.set(node.id, node);
  for (const edge of incoming.parent_child_edges) parentChildEdges.set(edge.id, edge);
  for (const edge of incoming.spouse_edges) spouseEdges.set(edge.id, edge);

  return { nodes, parentChildEdges, spouseEdges };
}

/** BFS generation distance from `centerId`: parents are -1 relative to their child, spouses share a level. */
function computeLevels(centerId: string, graph: GraphState): Map<string, number> {
  const adjacency = new Map<string, Array<{ id: string; delta: number }>>();
  const addEdge = (a: string, b: string, delta: number) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a)!.push({ id: b, delta });
  };

  for (const edge of graph.parentChildEdges.values()) {
    addEdge(edge.parent_id, edge.child_id, 1);
    addEdge(edge.child_id, edge.parent_id, -1);
  }
  for (const edge of graph.spouseEdges.values()) {
    addEdge(edge.person_a_id, edge.person_b_id, 0);
    addEdge(edge.person_b_id, edge.person_a_id, 0);
  }

  const levels = new Map<string, number>();
  if (!graph.nodes.has(centerId)) return levels;

  levels.set(centerId, 0);
  const queue = [centerId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current)!;
    for (const { id, delta } of adjacency.get(current) ?? []) {
      if (!levels.has(id) && graph.nodes.has(id)) {
        levels.set(id, currentLevel + delta);
        queue.push(id);
      }
    }
  }
  return levels;
}

type Unit = { ids: string[] };

/** Groups same-level nodes into spouse-pair units (kept adjacent) or singleton units. */
function buildUnits(levelNodeIds: string[], graph: GraphState): Unit[] {
  const consumed = new Set<string>();
  const units: Unit[] = [];
  const idSet = new Set(levelNodeIds);

  for (const id of levelNodeIds) {
    if (consumed.has(id)) continue;
    let partnerId: string | null = null;
    for (const edge of graph.spouseEdges.values()) {
      const other =
        edge.person_a_id === id ? edge.person_b_id : edge.person_b_id === id ? edge.person_a_id : null;
      if (other && idSet.has(other) && !consumed.has(other)) {
        partnerId = other;
        break;
      }
    }
    if (partnerId) {
      units.push({ ids: [id, partnerId] });
      consumed.add(id);
      consumed.add(partnerId);
    } else {
      units.push({ ids: [id] });
      consumed.add(id);
    }
  }
  return units;
}

export type NodePosition = { x: number; y: number };

export type TreeLayout = {
  positions: Map<string, NodePosition>;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/**
 * Layered layout, one pass per generation outward from the center in both
 * directions. Each level's units are ordered by the average x of whichever
 * adjacent (already-positioned) level anchors them, then spread out with a
 * simple left-to-right overlap resolution — a simplified Reingold-Tilford,
 * good enough for the bounded subgraphs this app ever renders.
 */
export function computeLayout(centerId: string, graph: GraphState): TreeLayout {
  const levels = computeLevels(centerId, graph);
  const positions = new Map<string, NodePosition>();

  if (levels.size === 0) {
    return { positions, minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  const nodesByLevel = new Map<number, string[]>();
  for (const [id, level] of levels) {
    if (!nodesByLevel.has(level)) nodesByLevel.set(level, []);
    nodesByLevel.get(level)!.push(id);
  }

  const levelNumbers = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
  const maxLevel = levelNumbers[levelNumbers.length - 1];
  const minLevel = levelNumbers[0];

  // Parent/child lookups restricted to the currently-known node set.
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  for (const edge of graph.parentChildEdges.values()) {
    if (!graph.nodes.has(edge.parent_id) || !graph.nodes.has(edge.child_id)) continue;
    if (!parentsOf.has(edge.child_id)) parentsOf.set(edge.child_id, []);
    parentsOf.get(edge.child_id)!.push(edge.parent_id);
    if (!childrenOf.has(edge.parent_id)) childrenOf.set(edge.parent_id, []);
    childrenOf.get(edge.parent_id)!.push(edge.child_id);
  }

  function unitWidth(unit: Unit) {
    return unit.ids.length * NODE_WIDTH + (unit.ids.length - 1) * SPOUSE_GAP;
  }

  function placeLevel(levelNum: number, anchorColumn: Map<string, string[]>) {
    const ids = nodesByLevel.get(levelNum) ?? [];
    const units = buildUnits(ids, graph);

    const withAnchor = units.map((unit) => {
      const anchorXs: number[] = [];
      for (const id of unit.ids) {
        for (const relId of anchorColumn.get(id) ?? []) {
          const pos = positions.get(relId);
          if (pos) anchorXs.push(pos.x);
        }
      }
      const anchorX = anchorXs.length > 0 ? anchorXs.reduce((a, b) => a + b, 0) / anchorXs.length : 0;
      return { unit, anchorX };
    });

    withAnchor.sort((a, b) => a.anchorX - b.anchorX || a.unit.ids[0].localeCompare(b.unit.ids[0]));

    let prevRight = -Infinity;
    for (const { unit, anchorX } of withAnchor) {
      const width = unitWidth(unit);
      const idealLeft = anchorX - width / 2;
      const left = prevRight === -Infinity ? idealLeft : Math.max(idealLeft, prevRight + COLUMN_SPACING - NODE_WIDTH);
      let x = left;
      for (const id of unit.ids) {
        positions.set(id, { x: x + NODE_WIDTH / 2, y: levelNum * ROW_SPACING });
        x += NODE_WIDTH + SPOUSE_GAP;
      }
      prevRight = left + width;
    }
  }

  // Level 0 first (center may have spouses but no adjacent-level anchor yet).
  placeLevel(0, new Map());

  for (let lvl = 1; lvl <= maxLevel; lvl++) placeLevel(lvl, parentsOf);
  for (let lvl = -1; lvl >= minLevel; lvl--) placeLevel(lvl, childrenOf);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const pos of positions.values()) {
    minX = Math.min(minX, pos.x - NODE_WIDTH / 2);
    maxX = Math.max(maxX, pos.x + NODE_WIDTH / 2);
    minY = Math.min(minY, pos.y - NODE_HEIGHT / 2);
    maxY = Math.max(maxY, pos.y + NODE_HEIGHT / 2);
  }

  return { positions, minX, maxX, minY, maxY };
}
