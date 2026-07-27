"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import Field from "@/components/Field";
import { api, ApiError } from "@/lib/api-client";

export default function ClaimPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { person } = await api.post<{ person: { id: string } }>(`/api/auth/claim/${token}`, {
        password,
      });
      router.push(`/tree/${person.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Claim your profile"
      subtitle="A relative added you to their family tree. Set a password to take ownership of your profile."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field
          label="Choose a password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50"
        >
          {pending ? "Claiming..." : "Claim profile"}
        </button>
      </form>
    </AuthCard>
  );
}
