"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { store } from "@/lib/store";
import { useAppData } from "@/lib/useData";
import { Button, Card, TopBar } from "@/components/ui";
import { colorFor, initials } from "@/lib/utils";
import type { Person, Snapshot } from "@/lib/types";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function RankingHistoryPage() {
  const { id, rankId } = useParams<{ id: string; rankId: string }>();
  const { data, loading } = useAppData();
  const [snaps, setSnaps] = useState<Snapshot[] | null>(null);

  const gc = useMemo(
    () => data?.groupChats.find((g) => g.id === id),
    [data, id]
  );
  const ranking = useMemo(
    () => data?.rankings.find((r) => r.id === rankId),
    [data, rankId]
  );

  useEffect(() => {
    let live = true;
    async function load() {
      const s = await store.getSnapshots(rankId);
      if (live) setSnaps(s);
    }
    load();
    const on = () => load();
    window.addEventListener("gc-rankings:change", on);
    return () => {
      live = false;
      window.removeEventListener("gc-rankings:change", on);
    };
  }, [rankId]);

  const peopleById = useMemo(
    () => new Map((gc?.people ?? []).map((p) => [p.id, p] as const)),
    [gc]
  );

  if (loading) return null;
  if (!gc || !ranking)
    return (
      <main>
        <TopBar title="Not found" back={{ href: `/gc/${id}` }} />
      </main>
    );

  return (
    <main className="pb-16">
      <TopBar
        title={gc.name}
        back={{ href: `/gc/${gc.id}/rank/${rankId}`, label: ranking.title }}
      />

      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-300">
          Version history
        </div>
        <h1 className="mb-2 font-display text-3xl font-700 tracking-tight text-ink">
          {ranking.title}
        </h1>
        <p className="mb-6 text-sm text-muted">
          Every time someone reorders this list, a snapshot is saved here. Newest
          first. ▲▼ shows how each person moved from the previous version.
        </p>

        {snaps === null ? (
          <Card className="p-8 text-center text-muted">Loading history…</Card>
        ) : snaps.length === 0 ? (
          <Card className="p-8 text-center text-muted">
            No edits recorded yet. Reorder this ranking and the first snapshot
            lands here.
          </Card>
        ) : (
          <div className="space-y-4">
            {snaps.map((snap, i) => {
              const prev = snaps[i + 1]; // older version below in the list
              const isLatest = i === 0;
              return (
                <motion.div
                  key={snap.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-ink">
                          {snap.editedBy || "Someone"}
                        </span>
                        <span className="text-muted">edited</span>
                        {isLatest && (
                          <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-bold text-brand-200">
                            current
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted">
                        {timeAgo(snap.createdAt)}
                      </span>
                    </div>
                    <ol className="space-y-1.5">
                      {snap.order.map((pid, idx) => {
                        const p = peopleById.get(pid) as Person | undefined;
                        if (!p) return null;
                        const wasIdx = prev ? prev.order.indexOf(pid) : -1;
                        const delta = wasIdx >= 0 ? wasIdx - idx : 0;
                        const isNew = prev && wasIdx < 0;
                        return (
                          <li
                            key={pid}
                            className="flex items-center gap-2.5 text-sm text-ink"
                          >
                            <span className="w-5 text-center font-display font-700 text-brand-300">
                              {idx + 1}
                            </span>
                            <span
                              className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white"
                              style={{ background: colorFor(pid) }}
                            >
                              {initials(p.name)}
                            </span>
                            <span className="flex-1">{p.name}</span>
                            {isNew ? (
                              <span className="text-xs font-semibold text-brand-300">
                                new
                              </span>
                            ) : delta > 0 ? (
                              <span className="text-xs font-semibold text-emerald-400">
                                ▲{delta}
                              </span>
                            ) : delta < 0 ? (
                              <span className="text-xs font-semibold text-rose-400">
                                ▼{-delta}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ol>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
