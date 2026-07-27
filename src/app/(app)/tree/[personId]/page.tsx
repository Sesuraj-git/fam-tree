import { notFound } from "next/navigation";
import { getTreeSubgraph } from "@/lib/tree";
import TreeView from "@/components/TreeView";

export default async function TreePage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const graph = await getTreeSubgraph(personId, 2, "both");
  if (!graph) notFound();

  return <TreeView centerId={personId} initialGraph={graph} />;
}
