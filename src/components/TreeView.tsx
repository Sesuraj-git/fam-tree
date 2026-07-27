"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { TreeGraphResponse } from "@/lib/types";
import {
  emptyGraph,
  mergeGraph,
  computeLayout,
  type GraphState,
  NODE_HEIGHT,
} from "@/lib/tree-layout";
import PersonNodeSvg from "@/components/PersonNodeSvg";

type Props = {
  centerId: string;
  initialGraph: {
    nodes: TreeGraphResponse["nodes"];
    parent_child_edges: TreeGraphResponse["parent_child_edges"];
    spouse_edges: TreeGraphResponse["spouse_edges"];
  };
};

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;

export default function TreeView({ centerId, initialGraph }: Props) {
  const router = useRouter();
  const [graph, setGraph] = useState<GraphState>(() => mergeGraph(emptyGraph(), initialGraph));
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const hasCentered = useRef(false);

  const layout = useMemo(() => computeLayout(centerId, graph), [centerId, graph]);

  const hiddenCounts = useMemo(() => {
    const includedChildren = new Map<string, number>();
    const includedParents = new Map<string, number>();
    for (const edge of graph.parentChildEdges.values()) {
      if (graph.nodes.has(edge.child_id)) {
        includedChildren.set(edge.parent_id, (includedChildren.get(edge.parent_id) ?? 0) + 1);
      }
      if (graph.nodes.has(edge.parent_id)) {
        includedParents.set(edge.child_id, (includedParents.get(edge.child_id) ?? 0) + 1);
      }
    }
    const result = new Map<string, { hiddenParents: number; hiddenChildren: number }>();
    for (const node of graph.nodes.values()) {
      result.set(node.id, {
        hiddenParents: Math.max(0, node.parents_count - (includedParents.get(node.id) ?? 0)),
        hiddenChildren: Math.max(0, node.children_count - (includedChildren.get(node.id) ?? 0)),
      });
    }
    return result;
  }, [graph]);

  useEffect(() => {
    if (hasCentered.current || !containerRef.current) return;
    const centerPos = layout.positions.get(centerId);
    if (!centerPos) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPan({ x: rect.width / 2 - centerPos.x, y: rect.height / 2 - centerPos.y });
    hasCentered.current = true;
  }, [layout, centerId]);

  const expandNode = useCallback(async (nodeId: string, direction: "ancestors" | "descendants") => {
    setLoadingId(nodeId);
    try {
      const res = await api.get<TreeGraphResponse>(
        `/api/tree/${nodeId}?depth=1&direction=${direction}`
      );
      setGraph((prev) => mergeGraph(prev, res));
    } finally {
      setLoadingId(null);
    }
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    setPan({
      x: dragState.current.panX + (e.clientX - dragState.current.startX),
      y: dragState.current.panY + (e.clientY - dragState.current.startY),
    });
  }
  function onPointerUp() {
    dragState.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - e.deltaY * 0.001)));
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-950 touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
    >
      <div className="absolute top-3 right-3 z-10 flex gap-1 text-sm">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.15))}
          className="w-8 h-8 rounded bg-white dark:bg-zinc-800 shadow border border-zinc-200 dark:border-zinc-700"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.15))}
          className="w-8 h-8 rounded bg-white dark:bg-zinc-800 shadow border border-zinc-200 dark:border-zinc-700"
        >
          −
        </button>
      </div>

      <svg width="100%" height="100%">
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {Array.from(graph.parentChildEdges.values()).map((edge) => {
            const parentPos = layout.positions.get(edge.parent_id);
            const childPos = layout.positions.get(edge.child_id);
            if (!parentPos || !childPos) return null;
            const midY = (parentPos.y + NODE_HEIGHT / 2 + (childPos.y - NODE_HEIGHT / 2)) / 2;
            return (
              <path
                key={edge.id}
                d={`M ${parentPos.x} ${parentPos.y + NODE_HEIGHT / 2} V ${midY} H ${childPos.x} V ${
                  childPos.y - NODE_HEIGHT / 2
                }`}
                fill="none"
                stroke="currentColor"
                className="text-zinc-400 dark:text-zinc-700"
                strokeWidth={2}
              />
            );
          })}

          {Array.from(graph.spouseEdges.values()).map((edge) => {
            const a = layout.positions.get(edge.person_a_id);
            const b = layout.positions.get(edge.person_b_id);
            if (!a || !b) return null;
            return (
              <line
                key={edge.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="currentColor"
                className="text-zinc-400 dark:text-zinc-700"
                strokeWidth={2}
                strokeDasharray={edge.status === "married" ? undefined : "4 3"}
              />
            );
          })}

          {Array.from(graph.nodes.values()).map((node) => {
            const pos = layout.positions.get(node.id);
            if (!pos) return null;
            const counts = hiddenCounts.get(node.id) ?? { hiddenParents: 0, hiddenChildren: 0 };
            return (
              <PersonNodeSvg
                key={node.id}
                node={node}
                x={pos.x}
                y={pos.y}
                hiddenParents={counts.hiddenParents}
                hiddenChildren={counts.hiddenChildren}
                loading={loadingId === node.id}
                onClick={() => router.push(`/person/${node.id}`)}
                onExpandParents={(e) => {
                  e.stopPropagation();
                  expandNode(node.id, "ancestors");
                }}
                onExpandChildren={(e) => {
                  e.stopPropagation();
                  expandNode(node.id, "descendants");
                }}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
