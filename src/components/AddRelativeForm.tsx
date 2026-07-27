"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import Field from "@/components/Field";

type Kind = "parent" | "child" | "spouse";

const ENDPOINT: Record<Kind, string> = {
  parent: "parents",
  child: "children",
  spouse: "spouse",
};

export default function AddRelativeForm({
  personId,
  kind,
  onDone,
  onCancel,
}: {
  personId: string;
  kind: Kind;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("unknown");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [relationshipType, setRelationshipType] = useState("biological");
  const [status, setStatus] = useState("married");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const body: Record<string, unknown> = {
        first_name: firstName,
        last_name: lastName,
        gender,
        date_of_birth: dateOfBirth || undefined,
      };
      if (kind === "parent" || kind === "child") body.relationship_type = relationshipType;
      if (kind === "spouse") body.status = status;

      await api.post(`/api/persons/${personId}/${ENDPOINT[kind]}`, body);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Field label="Last name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Gender</span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50"
          >
            <option value="unknown">Unknown</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
        <Field
          label="Date of birth"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />
      </div>

      {(kind === "parent" || kind === "child") && (
        <label className="block">
          <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Relationship</span>
          <select
            value={relationshipType}
            onChange={(e) => setRelationshipType(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50"
          >
            <option value="biological">Biological</option>
            <option value="adopted">Adopted</option>
            <option value="step">Step</option>
          </select>
        </label>
      )}

      {kind === "spouse" && (
        <label className="block">
          <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50"
          >
            <option value="married">Married</option>
            <option value="partnered">Partnered</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </label>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50"
        >
          {pending ? "Adding..." : "Add"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
