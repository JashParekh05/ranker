"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import type {
  AppData,
  GroupChat,
  Person,
  Ranking,
  Revision,
} from "./types";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isRemote = Boolean(SUPA_URL && SUPA_KEY);
export const supabase: SupabaseClient | null = isRemote
  ? createClient(SUPA_URL!, SUPA_KEY!)
  : null;

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("gc-rankings:change"));
  }
}

function genCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let s = "";
  for (let i = 0; i < 6; i++)
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

// move a person up one slot (toward rank 1) in an order array
export function bumpUp(order: string[], personId: string): string[] {
  const i = order.indexOf(personId);
  if (i <= 0) return order;
  const next = [...order];
  [next[i - 1], next[i]] = [next[i], next[i - 1]];
  return next;
}

/* ------------------------------------------------------------------ */
/* localStorage backend                                                */
/* ------------------------------------------------------------------ */

const KEY = "gc-rankings:v2";

function readLocal(): AppData {
  if (typeof window === "undefined")
    return { groupChats: [], rankings: [], revisions: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { groupChats: [], rankings: [], revisions: [] };
    const p = JSON.parse(raw) as AppData;
    return {
      groupChats: p.groupChats ?? [],
      rankings: p.rankings ?? [],
      revisions: p.revisions ?? [],
    };
  } catch {
    return { groupChats: [], rankings: [], revisions: [] };
  }
}

function writeLocal(data: AppData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(data));
  emitChange();
}

const localStore = {
  async getAll(): Promise<AppData> {
    return readLocal();
  },
  async getGroupChat(id: string) {
    return readLocal().groupChats.find((g) => g.id === id);
  },
  async getGroupChatByCode(code: string) {
    const c = code.trim().toUpperCase();
    return readLocal().groupChats.find((g) => g.code === c);
  },
  async createGroupChat(name: string, people: string[] = []): Promise<GroupChat> {
    const data = readLocal();
    const gc: GroupChat = {
      id: uuid(),
      name: name.trim() || "Untitled group",
      code: genCode(),
      createdAt: Date.now(),
      people: people
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => ({ id: uuid(), name: p })),
    };
    data.groupChats.push(gc);
    writeLocal(data);
    return gc;
  },
  async renameGroupChat(id: string, name: string) {
    const data = readLocal();
    const gc = data.groupChats.find((g) => g.id === id);
    if (gc) gc.name = name.trim() || gc.name;
    writeLocal(data);
  },
  async deleteGroupChat(id: string) {
    const data = readLocal();
    data.groupChats = data.groupChats.filter((g) => g.id !== id);
    data.rankings = data.rankings.filter((r) => r.gcId !== id);
    data.revisions = data.revisions.filter((r) => r.gcId !== id);
    writeLocal(data);
  },
  async addPerson(gcId: string, name: string) {
    const data = readLocal();
    const gc = data.groupChats.find((g) => g.id === gcId);
    if (!gc) return undefined;
    const person: Person = { id: uuid(), name: name.trim() };
    if (!person.name) return undefined;
    gc.people.push(person);
    writeLocal(data);
    return person;
  },
  async removePerson(gcId: string, personId: string) {
    const data = readLocal();
    const gc = data.groupChats.find((g) => g.id === gcId);
    if (!gc) return;
    gc.people = gc.people.filter((p) => p.id !== personId);
    for (const r of data.rankings.filter((r) => r.gcId === gcId))
      r.order = r.order.filter((id) => id !== personId);
    for (const r of data.revisions.filter((r) => r.gcId === gcId))
      r.order = r.order.filter((id) => id !== personId);
    writeLocal(data);
  },
  async getRankings(gcId: string) {
    return readLocal()
      .rankings.filter((r) => r.gcId === gcId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async getRanking(id: string) {
    return readLocal().rankings.find((r) => r.id === id);
  },
  async createRanking(
    gcId: string,
    title: string,
    author: string
  ): Promise<Ranking> {
    const data = readLocal();
    const gc = data.groupChats.find((g) => g.id === gcId);
    const ranking: Ranking = {
      id: uuid(),
      gcId,
      title: title.trim() || "Untitled ranking",
      order: [],
      author: author.trim() || "Anonymous",
      kind: "category",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    data.rankings.push(ranking);
    writeLocal(data);
    return ranking;
  },
  async createPersonalPrompt(gcId: string, title: string, author: string) {
    const data = readLocal();
    const prompt: Ranking = {
      id: uuid(),
      gcId,
      title: title.trim() || "Rank everyone",
      order: [],
      author: author.trim() || "Anonymous",
      kind: "personal",
      rater: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    data.rankings.push(prompt);
    writeLocal(data);
    return prompt;
  },
  async saveBallot(
    gcId: string,
    promptTitle: string,
    rater: string,
    order: string[]
  ) {
    const data = readLocal();
    let ballot = data.rankings.find(
      (r) =>
        r.gcId === gcId &&
        r.kind === "personal" &&
        r.rater != null &&
        r.title === promptTitle &&
        r.rater.trim().toLowerCase() === rater.trim().toLowerCase()
    );
    if (ballot) {
      ballot.order = order;
      ballot.updatedAt = Date.now();
    } else {
      ballot = {
        id: uuid(),
        gcId,
        title: promptTitle,
        order,
        author: rater,
        kind: "personal",
        rater,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      data.rankings.push(ballot);
    }
    writeLocal(data);
  },
  async saveRanking(
    id: string,
    patch: Partial<Pick<Ranking, "title" | "order">>
  ) {
    const data = readLocal();
    const r = data.rankings.find((x) => x.id === id);
    if (!r) return;
    if (patch.title !== undefined) r.title = patch.title.trim() || r.title;
    if (patch.order !== undefined) r.order = patch.order;
    r.updatedAt = Date.now();
    writeLocal(data);
  },
  async deleteRanking(id: string) {
    const data = readLocal();
    data.rankings = data.rankings.filter((r) => r.id !== id);
    data.revisions = data.revisions.filter((r) => r.rankingId !== id);
    writeLocal(data);
  },
  // --- revisions ---
  async getRevisions(rankingId: string) {
    return readLocal()
      .revisions.filter((r) => r.rankingId === rankingId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  async proposeRevision(
    rankingId: string,
    gcId: string,
    proposedBy: string,
    order: string[]
  ): Promise<Revision> {
    const data = readLocal();
    const rev: Revision = {
      id: uuid(),
      rankingId,
      gcId,
      proposedBy: proposedBy.trim() || "Anonymous",
      order,
      status: "pending",
      createdAt: Date.now(),
    };
    data.revisions.push(rev);
    writeLocal(data);
    return rev;
  },
  async approveRevision(id: string) {
    const data = readLocal();
    const rev = data.revisions.find((r) => r.id === id);
    if (!rev) return;
    const r = data.rankings.find((x) => x.id === rev.rankingId);
    if (r) {
      r.order = rev.order;
      r.updatedAt = Date.now();
    }
    rev.status = "approved";
    rev.resolvedAt = Date.now();
    writeLocal(data);
  },
  async rejectRevision(id: string) {
    const data = readLocal();
    const rev = data.revisions.find((r) => r.id === id);
    if (!rev) return;
    rev.status = "rejected";
    rev.resolvedAt = Date.now();
    writeLocal(data);
  },
};

/* ------------------------------------------------------------------ */
/* Supabase (shared) backend                                           */
/* ------------------------------------------------------------------ */

function makeSupabaseStore(db: SupabaseClient): typeof localStore {
  const self = {
    async getAll(): Promise<AppData> {
      const [{ data: gcs }, { data: people }, { data: ranks }, { data: revs }] =
        await Promise.all([
          db.from("gc_group_chats").select("*"),
          db.from("gc_people").select("*"),
          db.from("gc_rankings").select("*"),
          db.from("gc_revisions").select("*"),
        ]);
      const groupChats: GroupChat[] = (gcs ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        code: g.code,
        createdAt: Number(g.created_at),
        people: (people ?? [])
          .filter((p) => p.gc_id === g.id)
          .map((p) => ({ id: p.id, name: p.name, tag: p.tag ?? undefined })),
      }));
      const rankings: Ranking[] = (ranks ?? []).map((r) => ({
        id: r.id,
        gcId: r.gc_id,
        title: r.title,
        order: r.order ?? [],
        author: r.author ?? "Anonymous",
        kind: (r.kind ?? "category") as Ranking["kind"],
        rater: r.rater ?? null,
        createdAt: Number(r.created_at),
        updatedAt: Number(r.updated_at),
      }));
      const revisions: Revision[] = (revs ?? []).map((r) => ({
        id: r.id,
        rankingId: r.ranking_id,
        gcId: r.gc_id,
        proposedBy: r.proposed_by,
        order: r.order ?? [],
        status: r.status,
        createdAt: Number(r.created_at),
        resolvedAt: r.resolved_at ? Number(r.resolved_at) : undefined,
      }));
      return { groupChats, rankings, revisions };
    },
    async getGroupChat(id: string) {
      return (await self.getAll()).groupChats.find((g) => g.id === id);
    },
    async getGroupChatByCode(code: string) {
      const c = code.trim().toUpperCase();
      return (await self.getAll()).groupChats.find((g) => g.code === c);
    },
    async createGroupChat(name: string, people: string[] = []) {
      const id = uuid();
      const code = genCode();
      await db.from("gc_group_chats").insert({
        id,
        name: name.trim() || "Untitled group",
        code,
        created_at: Date.now(),
      });
      const rows = people
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => ({ id: uuid(), gc_id: id, name: p }));
      if (rows.length) await db.from("gc_people").insert(rows);
      emitChange();
      return {
        id,
        name,
        code,
        createdAt: Date.now(),
        people: rows.map((r) => ({ id: r.id, name: r.name })),
      } as GroupChat;
    },
    async renameGroupChat(id: string, name: string) {
      await db.from("gc_group_chats").update({ name: name.trim() }).eq("id", id);
      emitChange();
    },
    async deleteGroupChat(id: string) {
      await db.from("gc_group_chats").delete().eq("id", id);
      emitChange();
    },
    async addPerson(gcId: string, name: string) {
      const person: Person = { id: uuid(), name: name.trim() };
      if (!person.name) return undefined;
      await db
        .from("gc_people")
        .insert({ id: person.id, gc_id: gcId, name: person.name });
      emitChange();
      return person;
    },
    async removePerson(gcId: string, personId: string) {
      await db.from("gc_people").delete().eq("id", personId);
      const { data: ranks } = await db
        .from("gc_rankings")
        .select("id, order")
        .eq("gc_id", gcId);
      for (const r of ranks ?? []) {
        const next = (r.order ?? []).filter((x: string) => x !== personId);
        await db.from("gc_rankings").update({ order: next }).eq("id", r.id);
      }
      emitChange();
    },
    async getRankings(gcId: string) {
      return (await self.getAll()).rankings
        .filter((r) => r.gcId === gcId)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },
    async getRanking(id: string) {
      return (await self.getAll()).rankings.find((r) => r.id === id);
    },
    async createRanking(gcId: string, title: string, author: string) {
      const ranking: Ranking = {
        id: uuid(),
        gcId,
        title: title.trim() || "Untitled ranking",
        order: [],
        author: author.trim() || "Anonymous",
        kind: "category",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.from("gc_rankings").insert({
        id: ranking.id,
        gc_id: gcId,
        title: ranking.title,
        order: ranking.order,
        author: ranking.author,
        kind: "category",
        created_at: ranking.createdAt,
        updated_at: ranking.updatedAt,
      });
      emitChange();
      return ranking;
    },
    async createPersonalPrompt(gcId: string, title: string, author: string) {
      const prompt: Ranking = {
        id: uuid(),
        gcId,
        title: title.trim() || "Rank everyone",
        order: [],
        author: author.trim() || "Anonymous",
        kind: "personal",
        rater: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.from("gc_rankings").insert({
        id: prompt.id,
        gc_id: gcId,
        title: prompt.title,
        order: [],
        author: prompt.author,
        kind: "personal",
        rater: null,
        created_at: prompt.createdAt,
        updated_at: prompt.updatedAt,
      });
      emitChange();
      return prompt;
    },
    async saveBallot(
      gcId: string,
      promptTitle: string,
      rater: string,
      order: string[]
    ) {
      const { data: rows } = await db
        .from("gc_rankings")
        .select("id, rater")
        .eq("gc_id", gcId)
        .eq("kind", "personal")
        .eq("title", promptTitle)
        .not("rater", "is", null);
      const existing = (rows ?? []).find(
        (r) => (r.rater ?? "").trim().toLowerCase() === rater.trim().toLowerCase()
      );
      if (existing) {
        await db
          .from("gc_rankings")
          .update({ order, updated_at: Date.now() })
          .eq("id", existing.id);
        emitChange();
        return;
      }
      await db.from("gc_rankings").insert({
        id: uuid(),
        gc_id: gcId,
        title: promptTitle,
        order,
        author: rater,
        kind: "personal",
        rater,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      emitChange();
    },
    async saveRanking(
      id: string,
      patch: Partial<Pick<Ranking, "title" | "order">>
    ) {
      const upd: Record<string, unknown> = { updated_at: Date.now() };
      if (patch.title !== undefined) upd.title = patch.title.trim();
      if (patch.order !== undefined) upd.order = patch.order;
      await db.from("gc_rankings").update(upd).eq("id", id);
      emitChange();
    },
    async deleteRanking(id: string) {
      await db.from("gc_rankings").delete().eq("id", id);
      emitChange();
    },
    async getRevisions(rankingId: string) {
      return (await self.getAll()).revisions
        .filter((r) => r.rankingId === rankingId)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    async proposeRevision(
      rankingId: string,
      gcId: string,
      proposedBy: string,
      order: string[]
    ) {
      const rev: Revision = {
        id: uuid(),
        rankingId,
        gcId,
        proposedBy: proposedBy.trim() || "Anonymous",
        order,
        status: "pending",
        createdAt: Date.now(),
      };
      await db.from("gc_revisions").insert({
        id: rev.id,
        ranking_id: rankingId,
        gc_id: gcId,
        proposed_by: rev.proposedBy,
        order: rev.order,
        status: "pending",
        created_at: rev.createdAt,
      });
      emitChange();
      return rev;
    },
    async approveRevision(id: string) {
      const { data: revRows } = await db
        .from("gc_revisions")
        .select("*")
        .eq("id", id)
        .limit(1);
      const rev = revRows?.[0];
      if (!rev) return;
      await db
        .from("gc_rankings")
        .update({ order: rev.order, updated_at: Date.now() })
        .eq("id", rev.ranking_id);
      await db
        .from("gc_revisions")
        .update({ status: "approved", resolved_at: Date.now() })
        .eq("id", id);
      emitChange();
    },
    async rejectRevision(id: string) {
      await db
        .from("gc_revisions")
        .update({ status: "rejected", resolved_at: Date.now() })
        .eq("id", id);
      emitChange();
    },
  };
  return self;
}

export const store =
  isRemote && supabase ? makeSupabaseStore(supabase) : localStore;

export type Store = typeof store;
