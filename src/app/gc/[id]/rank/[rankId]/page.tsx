"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { store, bumpUp } from "@/lib/store";
import { useAppData } from "@/lib/useData";
import { useMe } from "@/lib/identity";
import { sameName } from "@/lib/identity";
import { Button, Card, TopBar } from "@/components/ui";
import { NameBadge } from "@/components/identity";
import { colorFor, initials } from "@/lib/utils";
import type { Person } from "@/lib/types";

export default function RankingEditorPage() {
  const { id, rankId } = useParams<{ id: string; rankId: string }>();
  const router = useRouter();
  const { data, loading } = useAppData();
  const [me] = useMe();

  const gc = useMemo(
    () => data?.groupChats.find((g) => g.id === id),
    [data, id]
  );
  const ranking = useMemo(
    () => data?.rankings.find((r) => r.id === rankId),
    [data, rankId]
  );
  const revisions = useMemo(
    () =>
      (data?.revisions ?? [])
        .filter((r) => r.rankingId === rankId)
        .sort((a, b) => b.createdAt - a.createdAt),
    [data, rankId]
  );

  const isAuthor = ranking ? sameName(ranking.author, me) : false;

  // draft order for the non-author "suggest reorder" flow
  const [draft, setDraft] = useState<string[] | null>(null);

  if (loading) return null;
  if (!gc || !ranking)
    return (
      <main>
        <TopBar title="Not found" back={{ href: `/gc/${id}` }} />
      </main>
    );

  const peopleById = new Map(gc.people.map((p) => [p.id, p]));
  const liveOrder = ranking.order;

  // author edits commit straight to the live ranking
  function authorBump(pid: string) {
    const next = bumpUp(liveOrder, pid);
    store.saveRanking(rankId, { order: next });
  }

  function saveTitle(t: string) {
    store.saveRanking(rankId, { title: t });
  }

  const pending = revisions.filter((r) => r.status === "pending");
  const myProposals = revisions.filter((r) => sameName(r.proposedBy, me));

  return (
    <main>
      <TopBar
        title={gc.name}
        back={{ href: `/gc/${gc.id}`, label: gc.name }}
        right={<NameBadge />}
      />

      <div className="mx-auto max-w-2xl px-5 py-8">
        {isAuthor ? (
          <input
            defaultValue={ranking.title}
            onChange={(e) => saveTitle(e.target.value)}
            className="mb-1 w-full bg-transparent font-display text-3xl font-700 tracking-tight text-ink outline-none"
          />
        ) : (
          <h1 className="mb-1 font-display text-3xl font-700 tracking-tight text-ink">
            {ranking.title}
          </h1>
        )}
        <p className="mb-6 text-sm text-muted">
          by {ranking.author}
          {isAuthor && " (you)"} . Rank 1 is the top.
        </p>

        {/* AUTHOR: direct edit */}
        {isAuthor && (
          <>
            <SectionLabel>Edit ranking (saves live)</SectionLabel>
            <BubbleList
              order={liveOrder}
              peopleById={peopleById}
              onBump={authorBump}
            />

            {/* pending approval queue */}
            <div className="mt-10">
              <SectionLabel>
                Pending suggestions{" "}
                {pending.length > 0 && (
                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                    {pending.length}
                  </span>
                )}
              </SectionLabel>
              {pending.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted">
                  No pending suggestions.
                </Card>
              ) : (
                <div className="space-y-4">
                  {pending.map((rev) => (
                    <Card key={rev.id} className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink">
                          {rev.proposedBy} suggested a reorder
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="soft"
                            onClick={() => store.approveRevision(rev.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => store.rejectRevision(rev.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                      <ProposedPreview
                        current={liveOrder}
                        proposed={rev.order}
                        peopleById={peopleById}
                      />
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* NON-AUTHOR: suggest a reorder */}
        {!isAuthor && (
          <>
            <SectionLabel>Current ranking</SectionLabel>
            {draft === null ? (
              <>
                <BubbleList
                  order={liveOrder}
                  peopleById={peopleById}
                  readOnly
                />
                <Button
                  className="mt-4"
                  onClick={() => setDraft([...liveOrder])}
                >
                  Suggest a reorder
                </Button>
              </>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted">
                  Tap a bubble to move it up. Submit to send this to{" "}
                  {ranking.author} for approval.
                </p>
                <BubbleList
                  order={draft}
                  peopleById={peopleById}
                  onBump={(pid) => setDraft((d) => (d ? bumpUp(d, pid) : d))}
                />
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={async () => {
                      await store.proposeRevision(
                        rankId,
                        gc.id,
                        me || "Anonymous",
                        draft
                      );
                      setDraft(null);
                    }}
                  >
                    Submit suggestion
                  </Button>
                  <Button variant="ghost" onClick={() => setDraft(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {myProposals.length > 0 && (
              <div className="mt-10">
                <SectionLabel>Your suggestions</SectionLabel>
                <div className="space-y-2">
                  {myProposals.map((rev) => (
                    <div
                      key={rev.id}
                      className="flex items-center justify-between rounded-xl2 border border-brand-100 bg-white/70 px-4 py-2.5 text-sm"
                    >
                      <span className="text-muted">
                        {new Date(rev.createdAt).toLocaleDateString()} reorder
                      </span>
                      <StatusPill status={rev.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center font-display text-sm font-700 uppercase tracking-wide text-muted">
      {children}
    </h2>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${map[status]}`}
    >
      {status}
    </span>
  );
}

function BubbleList({
  order,
  peopleById,
  onBump,
  readOnly,
}: {
  order: string[];
  peopleById: Map<string, Person>;
  onBump?: (pid: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {order.map((pid, i) => {
          const p = peopleById.get(pid);
          if (!p) return null;
          const clickable = !readOnly && onBump && i > 0;
          return (
            <motion.button
              layout
              key={pid}
              type="button"
              disabled={!clickable}
              onClick={() => onBump && onBump(pid)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
              className={
                "flex w-full items-center gap-3 rounded-xl2 border border-brand-100 bg-white/80 px-4 py-3 text-left shadow-soft transition " +
                (clickable
                  ? "hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop cursor-pointer"
                  : "cursor-default")
              }
            >
              <span className="w-6 text-center font-display text-lg font-700 text-brand-600">
                {i + 1}
              </span>
              <span
                className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white"
                style={{ background: colorFor(pid) }}
              >
                {initials(p.name)}
              </span>
              <span className="flex-1 font-medium text-ink">{p.name}</span>
              {clickable && (
                <span className="text-muted" aria-hidden>
                  {"\u2191 move up"}
                </span>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** Shows a proposed order and marks people whose rank changed. */
function ProposedPreview({
  current,
  proposed,
  peopleById,
}: {
  current: string[];
  proposed: string[];
  peopleById: Map<string, Person>;
}) {
  return (
    <ol className="space-y-1 text-sm">
      {proposed.map((pid, i) => {
        const p = peopleById.get(pid);
        if (!p) return null;
        const was = current.indexOf(pid);
        const delta = was - i; // positive = moved up
        return (
          <li key={pid} className="flex items-center gap-2 text-ink">
            <span className="w-4 text-muted">{i + 1}</span>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: colorFor(pid) }}
            />
            {p.name}
            {delta !== 0 && (
              <span
                className={
                  "text-xs font-bold " +
                  (delta > 0 ? "text-green-600" : "text-red-500")
                }
              >
                {delta > 0 ? `\u2191${delta}` : `\u2193${-delta}`}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
