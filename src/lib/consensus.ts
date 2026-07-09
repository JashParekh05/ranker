import type { GroupChat, Person, Ranking } from "./types";
import { sameName } from "./identity";

/**
 * Consensus aggregation over a set of personal ballots for one prompt.
 *
 * Borda count: within a ballot of length L, the person at index i (0 = top)
 * scores (L - i) points. A person left off a ballot scores 0 for that ballot.
 * Consensus order = people sorted by total Borda points (desc), ties broken by
 * how many ballots ranked them, then name.
 *
 * This is a pure reduce over data already stored as personal ballots
 * (kind="personal", rater != null). No new tables, no writes.
 */

export type ConsensusRow = {
  person: Person;
  rank: number; // 1-based consensus rank
  points: number; // total Borda points
  ballotsCounted: number; // how many ballots ranked this person
  /** normalized 0..1 strength of consensus placement (1 = top) */
  strength: number;
};

export function bordaConsensus(
  people: Person[],
  ballots: Ranking[]
): ConsensusRow[] {
  const points = new Map<string, number>();
  const counted = new Map<string, number>();
  for (const p of people) {
    points.set(p.id, 0);
    counted.set(p.id, 0);
  }

  for (const b of ballots) {
    const L = b.order.length;
    b.order.forEach((pid, i) => {
      if (!points.has(pid)) return; // person removed from roster
      points.set(pid, (points.get(pid) ?? 0) + (L - i));
      counted.set(pid, (counted.get(pid) ?? 0) + 1);
    });
  }

  const ranked = people
    .map((person) => ({
      person,
      points: points.get(person.id) ?? 0,
      ballotsCounted: counted.get(person.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.ballotsCounted - a.ballotsCounted ||
        a.person.name.localeCompare(b.person.name)
    );

  const n = ranked.length;
  return ranked.map((r, i) => ({
    ...r,
    rank: i + 1,
    strength: n <= 1 ? 1 : 1 - i / (n - 1),
  }));
}

export type TakeVsGroupRow = {
  person: Person;
  yourRank: number; // 1-based in your ballot
  groupRank: number; // 1-based in consensus
  /** groupRank - yourRank. positive = you rated them higher than the group */
  delta: number;
};

/**
 * Compare one rater's ballot against the consensus. Only includes people the
 * rater actually ranked. `delta > 0` means you had them higher than the group.
 */
export function takeVsGroup(
  myBallot: Ranking | undefined,
  consensus: ConsensusRow[]
): TakeVsGroupRow[] {
  if (!myBallot) return [];
  const groupRankById = new Map(consensus.map((c) => [c.person.id, c.rank]));
  const personById = new Map(consensus.map((c) => [c.person.id, c.person]));
  const rows: TakeVsGroupRow[] = [];
  myBallot.order.forEach((pid, i) => {
    const person = personById.get(pid);
    const groupRank = groupRankById.get(pid);
    if (!person || groupRank == null) return;
    rows.push({
      person,
      yourRank: i + 1,
      groupRank,
      delta: groupRank - (i + 1),
    });
  });
  // most divergent first — the screenshot-into-the-GC moments
  return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export type Participation = {
  voted: number;
  total: number;
  /** roster people who have NOT submitted a ballot yet */
  missing: Person[];
};

export function participation(
  gc: GroupChat,
  ballots: Ranking[]
): Participation {
  const missing = gc.people.filter(
    (p) => !ballots.some((b) => b.rater != null && sameName(b.rater, p.name))
  );
  return {
    voted: gc.people.length - missing.length,
    total: gc.people.length,
    missing,
  };
}

/** All personal ballots (rater != null) for a given prompt title in a group. */
export function ballotsForPrompt(
  rankings: Ranking[],
  gcId: string,
  title: string
): Ranking[] {
  return rankings.filter(
    (r) =>
      r.gcId === gcId &&
      r.kind === "personal" &&
      r.rater != null &&
      r.title === title
  );
}
