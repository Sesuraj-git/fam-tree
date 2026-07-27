import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Header from "@/components/Header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <Header personId={user.person.id} name={`${user.person.first_name} ${user.person.last_name}`} />
      <div className="flex flex-1 min-h-0">{children}</div>
    </div>
  );
}
