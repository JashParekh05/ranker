"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { store } from "@/lib/store";
import { useAppData } from "@/lib/useData";
import { useMe, useDevice, setMe } from "@/lib/identity";
import { addJoined } from "@/lib/joined";
import { Button, Card, TopBar } from "@/components/ui";
import { NameBadge } from "@/components/identity";
import { RankingCard } from "@/components/RankingCard";
import { aggregate, colorFor, initials } from "@/lib/utils";

export default function GcHubPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, refresh, loading } = useAppData();
  const [me] = useMe();
  const device = useDevice();

  const gc = useMemo(() => data?.groupChats.find((g) => g.id === id), [data, id]);
  const myPerson = useMemo(
    () => gc?.people.find((p) => p.claimedBy && p.claimedBy === device),
    [gc, device]
  );
  const identityName = myPerson?.name ?? me;

  useEffect(() => {
    if (gc) addJoined(gc.id);
  }, [gc?.id]);
  const rankings = useMemo(
    () =>
      (data?.rankings ?? [])
        .filter((r) => r.gcId === id && r.kind !== "personal")
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [data, id]
  );
  const personalPrompts = useMemo(
    () =>
      (data?.rankings ?? [])
        .filter((r) => r.gcId === id && r.kind === "personal" && r.rater == null)
        .sort((a, b) => b.createdAt - a.createdAt),
    [data, id]
  );
  const standing = useMemo(
    () =>
      gc
        ? [...aggregate(gc.people, rankings)].sort((a, b) => b.overall - a.overall)
        : [],
    [gc, rankings]
  );

  const ballotsFor = (title: string) =>
    (data?.rankings ?? []).filter(
      (r) => r.gcId === id && r.kind === "personal" && r.rater != null && r.title === title
    ).length;

  const [newRank, setNewRank] = useState("");
  const [newPersonal, setNewPersonal] = useState("");
  const [newPerson, setNewPerson] = useState("");
  const [invite, setInvite] = useState(false);
  const [reclaim, setReclaim] = useState(false);
  const [manageRoster, setManageRoster] = useState(false);
  const [copied, setCopied] = useState(false);
  const createRef = useRef<HTMLInputElement>(null);

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
    const r = await store.createRanking(gc!.id, newRank, identityName || "Anonymous");
    setNewRank("");
    router.push(`/gc/${gc!.id}/rank/${r.id}`);
  }
  async function createPersonal() {
    if (!newPersonal.trim()) return;
    await store.createPersonalPrompt(gc!.id, newPersonal, identityName || "Anonymous");
    setNewPersonal("");
    refresh();
  }
  async function addPerson() {
    if (!newPerson.trim()) return;
    await store.addPerson(gc!.id, newPerson);
    setNewPerson("");
    refresh();
  }
  function share() {
    const link = `${location.origin}/join/${gc!.code}`;
    const text = `Join "${gc!.name}" on GC Rankings: ${link}`;
    if (navigator.share) navigator.share({ title: gc!.name, text, url: link }).catch(() => {});
    else {
      navigator.clipboard?.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }
  const pendingCount = (rid: string) =>
    (data?.revisions ?? []).filter((r) => r.rankingId === rid && r.status === "pending").length;

  const maxSize = 46;
  const minSize = 30;

  return (
    <main className="pb-28">
      <TopBar
        title={gc.name}
        back={{ href: "/", label: "Groups" }}
        right={
          <>
            <NameBadge />
            <Button variant="soft" onClick={() => setInvite((v) => !v)}>
              Invite
            </Button>
            <Link href={`/gc/${gc.id}/map`}>
              <Button variant="soft">Map</Button>
            </Link>
          </>
        }
      />

      <div className="mx-auto max-w-5xl px-5 py-6">
        {invite && (
          <Card className="mb-6 flex items-center justify-between gap-3 p-4">
            <div>
              <div className="text-xs font-semibold text-muted">Group code</div>
              <div className="font-display text-2xl font-700 tracking-[0.3em] text-brand-300">
                {gc.code}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="soft"
                onClick={() => {
                  navigator.clipboard?.writeText(gc.code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button onClick={share}>Share</Button>
            </div>
          </Card>
        )}

        {/* Claim your identity (no login) */}
        {device && gc.people.length > 0 && (!myPerson || reclaim) && (
          <Card className="mb-6 p-4">
            <div className="mb-1 text-sm font-semibold text-ink">
              Who are you in this group?
            </div>
            <p className="mb-3 text-xs text-muted">
              Claim your spot so your rankings and approvals are really yours.
              No login, just tap your name on this device.
            </p>
            <div className="flex flex-wrap gap-2">
              {gc.people.map((p) => (
                <button
                  key={p.id}
                  onClick={async () => {
                    await store.claimPerson(gc.id, p.id, device);
                    if (!me) setMe(p.name);
                    setReclaim(false);
                    refresh();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-ink transition hover:bg-white/10"
                >
                  <span
                    className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: colorFor(p.id) }}
                  >
                    {initials(p.name)}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Roster with standing */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-700 uppercase tracking-wide text-muted">
              Roster
              <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-brand-200">
                {gc.people.length}
              </span>
            </h2>
            <div className="flex items-center gap-3">
              {myPerson && (
                <button
                  onClick={() => setReclaim(true)}
                  className="text-xs text-muted hover:text-brand-200"
                >
                  you are <span className="font-semibold text-brand-200">{myPerson.name}</span> · change
                </button>
              )}
              <button
                onClick={() => setManageRoster((v) => !v)}
                className="text-sm font-semibold text-brand-300 hover:text-brand-200"
              >
                {manageRoster ? "Done" : "Edit"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
            {standing.map((a, idx) => {
              const size =
                rankings.length === 0
                  ? 38
                  : minSize + a.overall * (maxSize - minSize);
              return (
                <div
                  key={a.person.id}
                  className="group flex flex-col items-center gap-1"
                  style={{ width: maxSize + 8 }}
                >
                  <div className="relative">
                    <span
                      className="grid place-items-center rounded-full font-bold text-white ring-2 ring-white shadow-soft"
                      style={{
                        width: size,
                        height: size,
                        background: colorFor(a.person.id),
                        fontSize: size * 0.34,
                      }}
                    >
                      {initials(a.person.name)}
                    </span>
                    {rankings.length > 0 && idx === 0 && (
                      <span className="absolute -right-1 -top-2 text-sm">👑</span>
                    )}
                    {manageRoster && (
                      <button
                        onClick={async () => {
                          await store.removePerson(gc.id, a.person.id);
                          refresh();
                        }}
                        className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-white/[0.06] text-xs text-red-500 shadow"
                        aria-label={`Remove ${a.person.name}`}
                      >
                        x
                      </button>
                    )}
                  </div>
                  <span className="max-w-full truncate text-xs font-medium text-ink">
                    {a.person.name}
                  </span>
                </div>
              );
            })}
            {gc.people.length === 0 && (
              <span className="text-sm text-muted">No people yet. Tap Edit to add.</span>
            )}
          </div>

          {manageRoster && (
            <div className="mt-4 flex gap-2">
              <input
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPerson()}
                placeholder="Add a person"
                className="w-56 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm outline-none focus:border-brand-500"
              />
              <Button variant="soft" onClick={addPerson}>
                Add
              </Button>
            </div>
          )}
        </section>

        {/* Category rankings */}
        <section className="mb-10">
          <h2 className="mb-3 font-display text-sm font-700 uppercase tracking-wide text-muted">
            Rankings
          </h2>
          <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <input
              ref={createRef}
              value={newRank}
              onChange={(e) => setNewRank(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createRanking()}
              placeholder="New ranking title (e.g. Funniest, Best Hoopers)"
              className="flex-1 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm outline-none focus:border-brand-500"
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
              {rankings.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <RankingCard gc={gc} ranking={r} pending={pendingCount(r.id)} />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Personal rankings */}
        <section>
          <h2 className="mb-1 font-display text-sm font-700 uppercase tracking-wide text-muted">
            Personal rankings
          </h2>
          <p className="mb-3 text-sm text-muted">
            Everyone ranks everyone. Powers the Reciprocity graph.
          </p>
          <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <input
              value={newPersonal}
              onChange={(e) => setNewPersonal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createPersonal()}
              placeholder="Prompt (e.g. Rank the group, best wingman to worst)"
              className="flex-1 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
            <Button variant="soft" onClick={createPersonal} disabled={!newPersonal.trim()}>
              Create personal ranking
            </Button>
          </Card>
          {personalPrompts.length === 0 ? (
            <Card className="p-8 text-center text-muted">
              No personal rankings yet.
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {personalPrompts.map((pr) => (
                <Link key={pr.id} href={`/gc/${gc.id}/personal/${pr.id}`}>
                  <Card className="p-5 transition hover:-translate-y-1 hover:shadow-pop">
                    <div className="font-display text-lg font-700 text-ink">
                      {pr.title}
                    </div>
                    <div className="mt-2 flex gap-3 text-sm text-muted">
                      <span>
                        {ballotsFor(pr.title)}/{gc.people.length} ballots
                      </span>
                      <span>by {pr.author}</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Mobile primary action */}
      <button
        onClick={() => {
          createRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          createRef.current?.focus();
        }}
        className="fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-2xl font-bold text-white shadow-pop transition hover:scale-105 active:scale-95 sm:hidden"
        aria-label="New ranking"
      >
        +
      </button>
    </main>
  );
}
