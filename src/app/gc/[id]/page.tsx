"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { store } from "@/lib/store";
import { useAppData } from "@/lib/useData";
import { useMe } from "@/lib/identity";
import { Button, Card, TopBar } from "@/components/ui";
import { NameBadge } from "@/components/identity";
import { colorFor, initials } from "@/lib/utils";

export default function GcHubPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, refresh, loading } = useAppData();
  const [me] = useMe();

  const gc = useMemo(
    () => data?.groupChats.find((g) => g.id === id),
    [data, id]
  );
  const rankings = useMemo(
    () =>
      (data?.rankings ?? [])
        .filter((r) => r.gcId === id)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [data, id]
  );

  const [newRank, setNewRank] = useState("");
  const [newPerson, setNewPerson] = useState("");
  const [copied, setCopied] = useState(false);

  if (loading) return null;
  if (!gc)
    return (
      <main>
        <TopBar title="Not found" back={{ href: "/" }} />
        <div className="mx-auto max-w-5xl px-5 py-10 text-muted">
          That group chat does not exist.
        </div>
      </main>
    );

  async function createRanking() {
    if (!newRank.trim()) return;
    const r = await store.createRanking(gc!.id, newRank, me || "Anonymous");
    setNewRank("");
    router.push(`/gc/${gc!.id}/rank/${r.id}`);
  }

  async function addPerson() {
    if (!newPerson.trim()) return;
    await store.addPerson(gc!.id, newPerson);
    setNewPerson("");
    refresh();
  }

  function pendingCount(rankingId: string) {
    return (data?.revisions ?? []).filter(
      (r) => r.rankingId === rankingId && r.status === "pending"
    ).length;
  }

  return (
    <main>
      <TopBar
        title={gc.name}
        back={{ href: "/", label: "Groups" }}
        right={
          <>
            <NameBadge />
            <Link href={`/gc/${gc.id}/map`}>
              <Button variant="soft">Open map</Button>
            </Link>
          </>
        }
      />

      <div className="mx-auto max-w-5xl px-5 py-8">
        {/* Share code */}
        <Card className="mb-8 flex items-center justify-between p-4">
          <div>
            <div className="text-sm font-semibold text-muted">
              Group code
            </div>
            <div className="font-display text-2xl font-700 tracking-[0.3em] text-brand-700">
              {gc.code}
            </div>
          </div>
          <Button
            variant="soft"
            onClick={() => {
              navigator.clipboard?.writeText(gc.code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy code"}
          </Button>
        </Card>

        {/* Roster */}
        <section className="mb-10">
          <h2 className="mb-3 font-display text-sm font-700 uppercase tracking-wide text-muted">
            Roster
          </h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {gc.people.map((p) => (
              <span
                key={p.id}
                className="group inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm shadow-soft"
              >
                <span
                  className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: colorFor(p.id) }}
                >
                  {initials(p.name)}
                </span>
                {p.name}
                <button
                  onClick={async () => {
                    await store.removePerson(gc.id, p.id);
                    refresh();
                  }}
                  className="ml-1 hidden text-muted hover:text-red-500 group-hover:inline"
                  aria-label={`Remove ${p.name}`}
                >
                  x
                </button>
              </span>
            ))}
            {gc.people.length === 0 && (
              <span className="text-sm text-muted">No people yet.</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPerson()}
              placeholder="Add a person"
              className="w-56 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500"
            />
            <Button variant="soft" onClick={addPerson}>
              Add
            </Button>
          </div>
        </section>

        {/* Rankings collection */}
        <section>
          <h2 className="mb-3 font-display text-sm font-700 uppercase tracking-wide text-muted">
            Rankings
          </h2>

          <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <input
              value={newRank}
              onChange={(e) => setNewRank(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createRanking()}
              placeholder="New ranking title (e.g. Funniest, Best Hoopers)"
              className="flex-1 rounded-full border border-brand-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
            <Button onClick={createRanking} disabled={!newRank.trim()}>
              Create ranking
            </Button>
          </Card>

          {rankings.length === 0 ? (
            <Card className="p-8 text-center text-muted">
              No rankings yet. Name one above and start ordering people.
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {rankings.map((r, i) => {
                const pending = pendingCount(r.id);
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link href={`/gc/${gc.id}/rank/${r.id}`}>
                      <Card className="p-5 transition hover:-translate-y-1 hover:shadow-pop">
                        <div className="mb-1 flex items-center justify-between">
                          <div className="font-display text-lg font-700 text-ink">
                            {r.title}
                          </div>
                          {pending > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                              {pending} pending
                            </span>
                          )}
                        </div>
                        <div className="mb-3 text-xs text-muted">
                          by {r.author}
                        </div>
                        <ol className="space-y-1 text-sm">
                          {r.order.slice(0, 5).map((pid, idx) => {
                            const person = gc.people.find((p) => p.id === pid);
                            if (!person) return null;
                            return (
                              <li
                                key={pid}
                                className="flex items-center gap-2 text-ink"
                              >
                                <span className="w-4 text-muted">
                                  {idx + 1}
                                </span>
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ background: colorFor(pid) }}
                                />
                                {person.name}
                              </li>
                            );
                          })}
                          {r.order.length > 5 && (
                            <li className="pl-6 text-muted">
                              +{r.order.length - 5} more
                            </li>
                          )}
                        </ol>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
