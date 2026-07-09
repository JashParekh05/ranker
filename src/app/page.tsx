"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { store } from "@/lib/store";
import { useAppData } from "@/lib/useData";
import { Button, Card, TopBar } from "@/components/ui";
import { NameBadge } from "@/components/identity";

export default function HomePage() {
  const { data, refresh, loading } = useAppData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [people, setPeople] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  async function create() {
    if (!name.trim()) return;
    const roster = people.split(/[\n,]/).map((p) => p.trim()).filter(Boolean);
    const gc = await store.createGroupChat(name, roster);
    setName("");
    setPeople("");
    setOpen(false);
    refresh();
    router.push(`/gc/${gc.id}`);
  }

  async function join() {
    setJoinError("");
    const gc = await store.getGroupChatByCode(joinCode);
    if (!gc) {
      setJoinError("No group with that code.");
      return;
    }
    router.push(`/gc/${gc.id}`);
  }

  return (
    <main>
      <TopBar
        title="GC Rankings"
        right={
          <>
            <NameBadge />
            <Button onClick={() => setOpen((v) => !v)}>
              {open ? "Close" : "New group"}
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-5xl px-5 py-8">
        <p className="mb-6 max-w-xl text-muted">
          Rank the people in your group chats. Anyone can suggest a reorder, the
          ranking author approves it. Join a group with its code.
        </p>

        {/* Join by code */}
        <Card className="mb-8 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && join()}
            placeholder="Enter group code (e.g. K7P2QX)"
            className="flex-1 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm tracking-widest outline-none focus:border-brand-500"
          />
          <Button variant="soft" onClick={join} disabled={!joinCode.trim()}>
            Join group
          </Button>
          {joinError && (
            <span className="text-sm text-red-500">{joinError}</span>
          )}
        </Card>

        {open && (
          <Card className="mb-8 p-5">
            <label className="mb-1 block text-sm font-semibold text-ink">
              Group chat name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Gt Q'ithers"
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 outline-none focus:border-brand-500"
            />
            <label className="mb-1 block text-sm font-semibold text-ink">
              Roster (one per line or comma separated)
            </label>
            <textarea
              value={people}
              onChange={(e) => setPeople(e.target.value)}
              rows={4}
              placeholder={"Mokshith\nKuvin\nBertha"}
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 outline-none focus:border-brand-500"
            />
            <Button onClick={create} disabled={!name.trim()}>
              Create group
            </Button>
          </Card>
        )}

        {loading ? null : data!.groupChats.length === 0 ? (
          <Card className="p-10 text-center text-muted">
            No groups yet. Create one, or join with a code.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data!.groupChats.map((gc, i) => {
              const count = data!.rankings.filter(
                (r) => r.gcId === gc.id
              ).length;
              return (
                <motion.div
                  key={gc.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link href={`/gc/${gc.id}`}>
                    <Card className="group p-5 transition hover:-translate-y-1 hover:shadow-pop">
                      <div className="flex items-center justify-between">
                        <div className="font-display text-lg font-700 text-ink">
                          {gc.name}
                        </div>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-brand-300">
                          {gc.code}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-3 text-sm text-muted">
                        <span>{gc.people.length} people</span>
                        <span>{count} rankings</span>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
