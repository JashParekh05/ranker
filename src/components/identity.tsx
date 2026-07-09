"use client";

import { useEffect, useState } from "react";
import { useMe } from "@/lib/identity";
import { Button, Card } from "./ui";

/** Blocks the app with a name prompt until the visitor identifies themselves. */
export function IdentityGate() {
  const [me, save] = useMe();
  const [draft, setDraft] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted || me) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 backdrop-blur-sm p-5">
      <Card className="w-full max-w-sm p-6">
        <h2 className="mb-1 font-display text-xl font-700 text-ink">
          What is your name?
        </h2>
        <p className="mb-4 text-sm text-muted">
          No account needed. Your name marks the rankings you create and the
          reorders you suggest.
        </p>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && draft.trim() && save(draft)}
          placeholder="e.g. Mokshith"
          className="mb-4 w-full rounded-xl border border-brand-200 bg-white px-4 py-2.5 outline-none focus:border-brand-500"
        />
        <Button
          className="w-full"
          disabled={!draft.trim()}
          onClick={() => save(draft)}
        >
          Continue
        </Button>
      </Card>
    </div>
  );
}

/** Small badge letting the user see / change their name. */
export function NameBadge() {
  const [me, save] = useMe();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(me);
  useEffect(() => setDraft(me), [me]);
  if (!me) return null;
  if (editing)
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim()) save(draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (draft.trim()) save(draft);
            setEditing(false);
          }
        }}
        className="w-32 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500"
      />
    );
  return (
    <button
      onClick={() => setEditing(true)}
      title="Change name"
      className="rounded-full bg-brand-100 px-3 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-200"
    >
      {me}
    </button>
  );
}
