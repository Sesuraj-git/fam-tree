"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import Field from "@/components/Field";
import { api, ApiError } from "@/lib/api-client";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api.post(`/api/auth/reset-password/${token}`, { password });
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard title="Choose a new password">
      {done ? (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Password updated. Redirecting to log in...
        </p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field
            label="New password"
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
            {pending ? "Saving..." : "Update password"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
