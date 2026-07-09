"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Reorder, motion } from "motion/react";
import { store } from "@/lib/store";
import { useAppData } from "@/lib/useData";
import { useMe, sameName } from "@/lib/identity";
import { Button, Card, TopBar } from "@/components/ui";
import { NameBadge } from "@/components/identity";
import { RankBuilder } from "@/components/RankBuilder";
import { colorFor, initials } from "@/lib/utils";
import type { Person } from "@/lib/types";

export default function RankingEditorPage() {
  const { id, rankId } = useParams<{ id: string; rankId: string }>();
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

  // author edits a live-committed order; non-author edits a draft proposal
  const [authorOrder, setAuthorOrder] = useState<string[] | null>(null);
  const [draft, setDraft] = useState<string[] | null>(null);

  useEffect(() => {
    if (ranking && authorOrder === null) setAuthorOrder(ranking.order);
  }, [ranking, authorOrder]);

  if (loading) return null;
  if (!gc || !ranking)
    return (
      <main>
        <TopBar title="Not found" back={{ href: `/gc/${id}` }} />
      </main>
    );

  const peopleById = new Map(gc.people.map((p) => [p.id, p]));
  const liveOrder = ranking.order;
  const pending = revisions.filter((r) => r.status === "pending");
  const myProposals = revisions.filter((r) => sameName(r.proposedBy, me));

  function authorReorder(next: string[]) {
    setAuthorOrder(next);
    store.saveRanking(rankId, { order: next });
  }

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
            onChange={(e) => store.saveRanking(rankId, { title: e.target.value })}
            className="mb-1 w-full bg-transparent font-display text-3xl font-700 tracking-tight text-ink outline-none"
          />
        ) : (
          <h1 className="mb-1 font-display text-3xl font-700 tracking-tight text-ink">
            {ranking.title}
          </h1>
        )}
        <p className="mb-6 text-sm text-muted">
          by {ranking.author}
          {isAuthor && " (you)"} . Drag to reorder. Rank 1 is the top.
        </p>

        {/* AUTHOR: live drag-and-drop */}
        {isAuthor && (
          <>
            <SectionLabel>Edit ranking (saves live)</SectionLabel>
            <RankBuilder
              order={authorOrder ?? liveOrder}
              roster={gc.people}
              onChange={authorReorder}
            />

            <div className="mt-10">
              <SectionLabel>
                Pending suggestions
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
                <RankBuilder order={liveOrder} roster={gc.people} disabled />
                <Button className="mt-4" onClick={() => setDraft([...liveOrder])}>
                  Suggest a reorder
                </Button>
              </>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted">
                  Drag to reorder, then submit for {ranking.author} to approve.
                </p>
                <RankBuilder order={draft} roster={gc.people} onChange={setDraft} />
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
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${map[status]}`}>
      {status}
    </span>
  );
}

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
        const delta = was - i;
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
