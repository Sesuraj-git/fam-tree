"use client";

import type { TreeNode } from "@/lib/types";
import { NODE_WIDTH, NODE_HEIGHT } from "@/lib/tree-layout";

export default function PersonNodeSvg({
  node,
  x,
  y,
  hiddenParents,
  hiddenChildren,
  loading,
  onClick,
  onExpandParents,
  onExpandChildren,
}: {
  node: TreeNode;
  x: number;
  y: number;
  hiddenParents: number;
  hiddenChildren: number;
  loading: boolean;
  onClick: () => void;
  onExpandParents: (e: React.MouseEvent) => void;
  onExpandChildren: (e: React.MouseEvent) => void;
}) {
  const left = x - NODE_WIDTH / 2;
  const top = y - NODE_HEIGHT / 2;

  return (
    <foreignObject x={left} y={top} width={NODE_WIDTH} height={NODE_HEIGHT} style={{ overflow: "visible" }}>
      <div className="relative w-full h-full flex items-center justify-center">
        {hiddenParents > 0 && (
          <button
            type="button"
            onClick={onExpandParents}
            title="Show more parents"
            className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-700 text-white text-[10px] px-2 py-0.5 shadow hover:bg-zinc-600"
          >
            {loading ? "..." : `+${hiddenParents} parent${hiddenParents > 1 ? "s" : ""}`}
          </button>
        )}

        <button
          type="button"
          onClick={onClick}
          className={`w-full h-full rounded-lg border-2 px-2 text-center flex flex-col items-center justify-center bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md transition-shadow ${
            node.has_account
              ? "border-solid border-zinc-400 dark:border-zinc-500"
              : "border-dashed border-zinc-400 dark:border-zinc-600"
          } ${!node.is_alive ? "opacity-60" : ""}`}
        >
          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50 leading-tight">
            {node.first_name} {node.last_name}
          </span>
          {!node.has_account && (
            <span className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">invite ✉</span>
          )}
        </button>

        {hiddenChildren > 0 && (
          <button
            type="button"
            onClick={onExpandChildren}
            title="Show more children"
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-700 text-white text-[10px] px-2 py-0.5 shadow hover:bg-zinc-600"
          >
            {loading ? "..." : `+${hiddenChildren} child${hiddenChildren > 1 ? "ren" : ""}`}
          </button>
        )}
      </div>
    </foreignObject>
  );
}
