"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

export default function Header({
  personId,
  name,
}: {
  personId: string;
  name: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    await api.post("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
      <Link href={`/tree/${personId}`} className="font-semibold text-zinc-900 dark:text-zinc-50">
        Family Tree
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link
          href={`/person/${personId}`}
          className="text-zinc-600 dark:text-zinc-400 hover:underline"
        >
          {name}
        </Link>
        <button
          onClick={handleLogout}
          className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
