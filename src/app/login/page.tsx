"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import Field from "@/components/Field";
import { api, ApiError } from "@/lib/api-client";
import type { CurrentUser } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api.post("/api/auth/login", { email, password });
      const me = await api.get<CurrentUser>("/api/me");
      router.push(`/tree/${me.person.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard title="Log in" subtitle="Welcome back to your family tree.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50"
        >
          {pending ? "Logging in..." : "Log in"}
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/signup" className="hover:underline">
          Create an account
        </Link>
        <Link href="/forgot-password" className="hover:underline">
          Forgot password?
        </Link>
      </div>
    </AuthCard>
  );
}
