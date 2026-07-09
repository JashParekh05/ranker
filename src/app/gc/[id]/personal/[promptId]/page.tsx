"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { store } from "@/lib/store";
import { useAppData } from "@/lib/useData";
import { useMe, sameName, useDevice } from "@/lib/identity";
import { Button, Card, TopBar } from "@/components/ui";
import { NameBadge } from "@/components/identity";
import { RankBuilder } from "@/components/RankBuilder";
import { colorFor, initials } from "@/lib/utils";

export default function PersonalBallotPage() {
  const { id, promptId } = useParams<{ id: string; promptId: string }>();
  const { data, loading } = useAppData();
  const [me] = useMe();
  const device = useDevice();

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
      (data?.rankings ?? []).filter(
        (r) =>
          r.gcId === id &&
          r.kind === "personal" &&
          r.rater != null &&
          prompt != null &&
          r.title === prompt.title
      ),
    [data, id, prompt]
  );

  const identityName =
    gc?.people.find((p) => p.claimedBy && p.claimedBy === device)?.name ?? me;
  const myBallot = ballots.find((b) => sameName(b.rater ?? "", identityName));

  const [myOrder, setMyOrder] = useState<string[] | null>(null);
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!seeded && prompt) {
      setMyOrder(myBallot ? myBallot.order : []);
      setSeeded(true);
    }
  }, [seeded, prompt, myBallot]);

  if (loading) return null;
  if (!gc || !prompt)
    return (
      <main>
        <TopBar title="Not found" back={{ href: `/gc/${id}` }} />
      </main>
    );

  function save(next: string[]) {
    setMyOrder(next);
    store.saveBallot(gc!.id, prompt!.title, identityName || "Anonymous", next);
  }

  return (
    <main>
      <TopBar
        title={gc.name}
        back={{ href: `/gc/${gc.id}`, label: gc.name }}
        right={
          <>
            <NameBadge />
            <Link href={`/gc/${gc.id}/consensus/${prompt.id}`}>
              <Button variant="soft">Group consensus</Button>
            </Link>
          </>
        }
      />

      <div className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="mb-1 font-display text-3xl font-700 tracking-tight text-ink">
          {prompt.title}
        </h1>
        <p className="mb-6 text-sm text-muted">
          Your personal ranking of the group. Only you can edit yours. Everyone
          fills their own, then the Reciprocity map shows who rates who.
        </p>

        <h2 className="mb-3 font-display text-sm font-700 uppercase tracking-wide text-muted">
          Your ballot
        </h2>
        <RankBuilder
          order={myOrder ?? []}
          roster={gc.people}
          onChange={save}
        />

        <div className="mt-10">
          <h2 className="mb-3 font-display text-sm font-700 uppercase tracking-wide text-muted">
            Submitted ({ballots.length}/{gc.people.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {ballots.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-sm shadow-soft"
              >
                <span
                  className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: colorFor(b.id) }}
                >
                  {initials(b.rater ?? "?")}
                </span>
                {b.rater}
                {sameName(b.rater ?? "", identityName) && (
                  <span className="text-brand-500">you</span>
                )}
              </span>
            ))}
            {ballots.length === 0 && (
              <span className="text-sm text-muted">No ballots yet.</span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
