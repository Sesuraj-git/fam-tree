import { notFound } from "next/navigation";
import { getPersonDetail } from "@/lib/persons";
import { canEditPerson } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth";
import PersonDetailClient from "@/components/PersonDetailClient";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [detail, user] = await Promise.all([getPersonDetail(id), getCurrentUser()]);
  if (!detail || !user) notFound();

  const canEdit = await canEditPerson(user.id, id);

  return <PersonDetailClient person={detail} canEdit={canEdit} />;
}
