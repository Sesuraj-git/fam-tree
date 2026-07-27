"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import Field from "@/components/Field";
import AddRelativeForm from "@/components/AddRelativeForm";
import type { PersonDetail } from "@/lib/types";

function RelativeCard({ id, first_name, last_name, has_account, is_alive, extra }: {
  id: string;
  first_name: string;
  last_name: string;
  has_account: boolean;
  is_alive: boolean;
  extra?: string;
}) {
  return (
    <Link
      href={`/person/${id}`}
      className={`block rounded-md border px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
        has_account ? "border-solid border-zinc-300 dark:border-zinc-600" : "border-dashed border-zinc-300 dark:border-zinc-700"
      } ${!is_alive ? "opacity-60" : ""}`}
    >
      <span className="font-medium text-zinc-900 dark:text-zinc-50">
        {first_name} {last_name}
      </span>
      {extra && <span className="ml-2 text-zinc-500 dark:text-zinc-400">{extra}</span>}
      {!has_account && <span className="ml-2 text-xs text-zinc-400">(placeholder)</span>}
    </Link>
  );
}

type ActivePanel = null | "add-parent" | "add-child" | "add-spouse" | "edit" | "convert" | "delete";

export default function PersonDetailClient({
  person,
  canEdit,
}: {
  person: PersonDetail;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<ActivePanel>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setPanel(null);
    router.refresh();
  }

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/tree/${person.id}`}
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
          >
            ← View in tree
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {person.first_name} {person.last_name}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 capitalize">
                {person.gender} · {person.has_account ? "Has an account" : "Placeholder (no account)"}
                {!person.is_alive && " · Deceased"}
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {person.date_of_birth ? `Born ${person.date_of_birth.slice(0, 10)}` : "Birth date unknown"}
                {person.date_of_death && ` · Died ${person.date_of_death.slice(0, 10)}`}
              </p>
              {person.notes && (
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                  {person.notes}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            <span>{person.ancestor_count} ancestors</span>
            <span>{person.descendant_count} descendants</span>
          </div>

          {canEdit && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <ActionButton label="Add parent" onClick={() => setPanel("add-parent")} />
              <ActionButton label="Add child" onClick={() => setPanel("add-child")} />
              <ActionButton label="Add spouse" onClick={() => setPanel("add-spouse")} />
              <ActionButton label="Edit details" onClick={() => setPanel("edit")} />
              {!person.has_account && (
                <ActionButton label="Convert to account" onClick={() => setPanel("convert")} />
              )}
              <ActionButton label="Delete" danger onClick={() => setPanel("delete")} />
            </div>
          )}

          {panel === "add-parent" && (
            <AddRelativeForm personId={person.id} kind="parent" onDone={refresh} onCancel={() => setPanel(null)} />
          )}
          {panel === "add-child" && (
            <AddRelativeForm personId={person.id} kind="child" onDone={refresh} onCancel={() => setPanel(null)} />
          )}
          {panel === "add-spouse" && (
            <AddRelativeForm personId={person.id} kind="spouse" onDone={refresh} onCancel={() => setPanel(null)} />
          )}
          {panel === "edit" && (
            <EditForm person={person} onDone={refresh} onCancel={() => setPanel(null)} />
          )}
          {panel === "convert" && (
            <ConvertForm personId={person.id} onDone={refresh} onCancel={() => setPanel(null)} />
          )}
          {panel === "delete" && (
            <DeleteConfirm
              personId={person.id}
              onDeleted={() => router.push("/tree")}
              onCancel={() => setPanel(null)}
            />
          )}
        </div>

        <Section title="Parents">
          {person.parents.length === 0 ? (
            <Empty />
          ) : (
            person.parents.map((p) => (
              <RelativeCard key={p.relationship_id} {...p} extra={p.relationship_type} />
            ))
          )}
        </Section>

        <Section title="Spouses">
          {person.spouses.length === 0 ? (
            <Empty />
          ) : (
            person.spouses.map((s) => <RelativeCard key={s.relationship_id} {...s} extra={s.status} />)
          )}
        </Section>

        <Section title="Children">
          {person.children.length === 0 ? (
            <Empty />
          ) : (
            person.children.map((c) => (
              <RelativeCard key={c.relationship_id} {...c} extra={c.relationship_type} />
            ))
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-zinc-400 dark:text-zinc-600">None recorded</p>;
}

function ActionButton({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        danger
          ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      {label}
    </button>
  );
}

function EditForm({
  person,
  onDone,
  onCancel,
}: {
  person: PersonDetail;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState(person.first_name);
  const [lastName, setLastName] = useState(person.last_name);
  const [dateOfDeath, setDateOfDeath] = useState(person.date_of_death?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(person.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api.patch(`/api/persons/${person.id}`, {
        first_name: firstName,
        last_name: lastName,
        date_of_death: dateOfDeath || null,
        notes: notes || null,
      });
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
        <Field label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Field label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <Field
        label="Date of death (leave blank if living)"
        type="date"
        value={dateOfDeath}
        onChange={(e) => setDateOfDeath(e.target.value)}
      />
      <label className="block">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50"
        />
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
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

function ConvertForm({
  personId,
  onDone,
  onCancel,
}: {
  personId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api.post(`/api/persons/${personId}/invite`, { email });
      setMessage(`Invite sent to ${email}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (message) {
    return (
      <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{message}</p>
        <button
          type="button"
          onClick={onDone}
          className="mt-3 rounded-md px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4"
    >
      <Field
        label="Their email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send invite"}
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

function DeleteConfirm({
  personId,
  onDeleted,
  onCancel,
}: {
  personId: string;
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const [needsConfirm, setNeedsConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function doDelete(confirm: boolean) {
    setPending(true);
    setError(null);
    try {
      await api.delete(`/api/persons/${personId}`, { confirm });
      onDeleted();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNeedsConfirm(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4">
      <p className="text-sm text-red-700 dark:text-red-300">
        {needsConfirm ?? "Are you sure you want to delete this person? This is a soft-delete — their record is hidden but not destroyed."}
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => doDelete(Boolean(needsConfirm))}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          {pending ? "Deleting..." : needsConfirm ? "Delete anyway" : "Delete"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
