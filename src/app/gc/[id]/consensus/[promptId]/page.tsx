"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { store } from "@/lib/store";
import { useAppData } from "@/lib/useData";
import { useMe, sameName, useDevice } from "@/lib/identity";
import { Button, Card, TopBar } from "@/components/ui";
import { NameBadge } from "@/components/identity";
import { colorFor, initials } from "@/lib/utils";
import {
  bordaConsensus,
  takeVsGroup,
  participation,
  ballotsForPrompt,
} from "@/lib/consensus";

export default function ConsensusPage() {
  const { id, promptId } = useParams<{ id: string; promptId: string }>();
  const { data, loading } = useAppData();
  const [me] = useMe();
  const device = useDevice();
  const [copied, setCopied] = useState(false);

  const gc = useMemo(
    () => data?.groupChats.find((g) => g.id === id),
    [data, id]
  );
  const prompt = useMemo(
    () => data?.rankings.find((r) => r.id === promptId),
    [data, promptId]
  );
  const ballots = useMemo(
    () =>
      prompt ? ballotsForPrompt(data?.rankings ?? [], id, prompt.title) : [],
    [data, id, prompt]
  );

  const identityName =
    gc?.people.find((p) => p.claimedBy && p.claimedBy === device)?.name ?? me;
  const myBallot = useMemo(
    () => ballots.find((b) => sameName(b.rater ?? "", identityName)),
    [ballots, identityName]
  );

  const consensus = useMemo(
    () => (gc ? bordaConsensus(gc.people, ballots) : []),
    [gc, ballots]
  );
  const myTake = useMemo(
    () => takeVsGroup(myBallot, consensus),
    [myBallot, consensus]
  );
  const part = useMemo(
    () => (gc ? participation(gc, ballots) : { voted: 0, total: 0, missing: [] }),
    [gc, ballots]
  );

  if (loading) return null;
  if (!gc || !prompt)
    return (
      <main>
        <TopBar title="Not found" back={{ href: `/gc/${id}` }} />
      </main>
    );

  const pct = part.total > 0 ? Math.round((part.voted / part.total) * 100) : 0;

  function nudge() {
    const link = `${location.origin}/join/${gc!.code}`;
    const names = part.missing.map((p) => p.name).join(", ");
    const text = part.missing.length
      ? `${part.missing.length} still haven't ranked "${prompt!.title}" (${names}). Fill yours: ${link}`
      : `Everyone ranked "${prompt!.title}"! See the group consensus: ${link}`;
    if (navigator.share)
      navigator.share({ title: prompt!.title, text, url: link }).catch(() => {});
    else {
      navigator.clipboard?.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  const hasData = ballots.length > 0;

  return (
    <main className="pb-16">
      <TopBar
        title={gc.name}
        back={{ href: `/gc/${gc.id}`, label: gc.name }}
        right={
          <>
            <NameBadge />
            <Link href={`/gc/${gc.id}/personal/${prompt.id}`}>
              <Button variant="soft">Fill your ballot</Button>
            </Link>
          </>
        }
      />

      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-300">
          Group consensus
        </div>
        <h1 className="mb-2 font-display text-3xl font-700 tracking-tight text-ink">
          {prompt.title}
        </h1>
        <p className="mb-6 text-sm text-muted">
          Everyone&apos;s ballots combined by Borda count (rank 1 = most points).
          This is the group&apos;s official call, not one person&apos;s take.
        </p>

        {/* Participation nudge */}
        <Card className="mb-8 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">
              {part.voted}/{part.total} voted
            </span>
            <span className="text-muted">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {part.missing.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted">
                Still waiting on{" "}
                <span className="text-ink">
                  {part.missing
                    .slice(0, 4)
                    .map((p) => p.name)
                    .join(", ")}
                  {part.missing.length > 4 && ` +${part.missing.length - 4} more`}
                </span>
              </span>
              <Button variant="soft" onClick={nudge}>
                {copied ? "Copied nudge" : "Nudge them"}
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-brand-200">
                Everyone voted. This is locked in.
              </span>
              <Button variant="soft" onClick={nudge}>
                {copied ? "Copied" : "Share result"}
              </Button>
            </div>
          )}
        </Card>

        {!hasData ? (
          <Card className="p-8 text-center text-muted">
            No ballots yet. Once people fill{" "}
            <Link
              href={`/gc/${gc.id}/personal/${prompt.id}`}
              className="text-brand-300 underline"
            >
              their ballot
            </Link>
            , the group consensus builds itself here.
          </Card>
        ) : (
          <>
            {/* Consensus standings */}
            <h2 className="mb-3 font-display text-sm font-700 uppercase tracking-wide text-muted">
              The group says
            </h2>
            <div className="space-y-2">
              {consensus.map((c, i) => (
                <motion.div
                  key={c.person.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 rounded-xl2 border border-white/10 bg-white/[0.06] px-4 py-3 shadow-soft"
                >
                  <span className="w-6 text-center font-display text-lg font-700 text-brand-300">
                    {c.rank}
                  </span>
                  <span
                    className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white"
                    style={{ background: colorFor(c.person.id) }}
                  >
                    {initials(c.person.name)}
                  </span>
                  <span className="flex-1 font-medium text-ink">
                    {c.person.name}
                  </span>
                  <span className="text-xs text-muted">
                    {c.points} pts · {c.ballotsCounted} ballots
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Your take vs the group */}
            {myTake.length > 0 && (
              <div className="mt-10">
                <h2 className="mb-1 font-display text-sm font-700 uppercase tracking-wide text-muted">
                  Your take vs the group
                </h2>
                <p className="mb-3 text-xs text-muted">
                  Where your ballot disagreed most with the consensus.
                </p>
                <div className="space-y-2">
                  {myTake.slice(0, 6).map((t) => (
                    <div
                      key={t.person.id}
                      className="flex items-center gap-3 rounded-xl2 border border-white/10 bg-white/[0.04] px-4 py-2.5"
                    >
                      <span
                        className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-white"
                        style={{ background: colorFor(t.person.id) }}
                      >
                        {initials(t.person.name)}
                      </span>
                      <span className="flex-1 text-sm text-ink">
                        You had <b>{t.person.name}</b> #{t.yourRank}, group says #
                        {t.groupRank}
                      </span>
                      {t.delta === 0 ? (
                        <span className="text-xs font-semibold text-muted">
                          match
                        </span>
                      ) : t.delta > 0 ? (
                        <span className="text-xs font-semibold text-emerald-400">
                          ▲ you rate {Math.abs(t.delta)} higher
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-rose-400">
                          ▼ you rate {Math.abs(t.delta)} lower
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!myBallot && (
              <Card className="mt-8 p-5 text-center">
                <p className="mb-3 text-sm text-muted">
                  You haven&apos;t ranked this yet. Fill yours to see how your
                  take compares to the group.
                </p>
                <Link href={`/gc/${gc.id}/personal/${prompt.id}`}>
                  <Button>Fill your ballot</Button>
                </Link>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
