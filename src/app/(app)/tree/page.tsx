import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function TreeIndexPage() {
  const user = await getCurrentUser();
  // AppLayout already redirects to /login when unauthenticated, so user is non-null here.
  redirect(`/tree/${user!.person.id}`);
}
