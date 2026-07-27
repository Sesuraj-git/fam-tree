"use client";

import { useState } from "react";
import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import Field from "@/components/Field";
import { api, ApiError } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await api.post<{ message: string }>("/api/auth/forgot-password", { email });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      {message ? (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{message}</p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50"
          >
            {pending ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/login" className="hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}
