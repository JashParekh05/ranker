import type { GroupChat, Ranking } from "./types";
import { aggregate, standing } from "./utils";

export type SimNode = {
  id: string;
  name: string;
  score: number; // overall standing 0..1 (drives size)
};
export type SimLink = { source: string; target: string; similarity: number };

/**
 * Similarity between two people = 1 - mean absolute difference of their
 * standings across every ranking they BOTH appear in. 1 = ranked identically.
 * Returns null if they never co-appear.
 */
export function pairSimilarity(
  a: string,
  b: string,
  rankings: Ranking[]
): number | null {
  const diffs: number[] = [];
  for (const r of rankings) {
    const sa = standing(r, a);
    const sb = standing(r, b);
    if (sa !== null && sb !== null) diffs.push(Math.abs(sa - sb));
  }
  if (diffs.length === 0) return null;
  return 1 - diffs.reduce((x, y) => x + y, 0) / diffs.length;
}

/** Build a similarity graph. Links kept only above `threshold`. */
export function buildSimilarityGraph(
  gc: GroupChat,
  rankings: Ranking[],
  threshold = 0.62
): { nodes: SimNode[]; links: SimLink[] } {
  const agg = aggregate(gc.people, rankings);
  const nodes: SimNode[] = agg.map((a) => ({
    id: a.person.id,
    name: a.person.name,
    score: a.overall,
  }));
  const links: SimLink[] = [];
  for (let i = 0; i < gc.people.length; i++) {
    for (let j = i + 1; j < gc.people.length; j++) {
      const sim = pairSimilarity(gc.people[i].id, gc.people[j].id, rankings);
      if (sim !== null && sim >= threshold) {
        links.push({
          source: gc.people[i].id,
          target: gc.people[j].id,
          similarity: sim,
        });
      }
    }
  }
  return { nodes, links };
}

export type ScatterPoint = {
  id: string;
  name: string;
  x: number; // avg standing received 0..1
  y: number; // controversy (variance of standing) 0..1
  appearances: number;
};

export function buildScatter(gc: GroupChat, rankings: Ranking[]): ScatterPoint[] {
  return aggregate(gc.people, rankings).map((a) => ({
    id: a.person.id,
    name: a.person.name,
    x: a.overall,
    y: a.volatility,
    appearances: a.appearances,
  }));
}

export type DirLink = {
  source: string;
  target: string;
  weight: number; // how highly source ranked target (0..1, 1 = their #1)
  asym: number; // |weight - reverseWeight|, 0 if reverse missing
};

/**
 * Directed reciprocity graph from a set of personal ballots (each rater's
 * ranking of the whole roster). Edge source->target weight = how highly the
 * rater ranked that person. `asym` flags one-sided relationships.
 */
export function buildReciprocity(
  gc: GroupChat,
  ballots: Ranking[],
  minWeight = 0.6
): { nodes: SimNode[]; links: DirLink[] } {
  const byRater = new Map<string, Ranking>();
  for (const b of ballots)
    if (b.rater) byRater.set(b.rater.trim().toLowerCase(), b);

  const links: DirLink[] = [];
  const incoming: Record<string, number[]> = {};

  for (const rater of gc.people) {
    const ballot = byRater.get(rater.name.trim().toLowerCase());
    if (!ballot) continue;
    for (const target of gc.people) {
      if (target.id === rater.id) continue;
      const s = standing(ballot, target.id);
      if (s === null) continue;
      (incoming[target.id] ??= []).push(s);
      if (s < minWeight) continue;
      const rb = byRater.get(target.name.trim().toLowerCase());
      const rs = rb ? standing(rb, rater.id) : null;
      links.push({
        source: rater.id,
        target: target.id,
        weight: s,
        asym: rs === null ? 0 : Math.abs(s - rs),
      });
    }
  }

  const nodes: SimNode[] = gc.people.map((p) => {
    const inc = incoming[p.id] ?? [];
    const score = inc.length
      ? inc.reduce((a, b) => a + b, 0) / inc.length
      : 0.5;
    return { id: p.id, name: p.name, score };
  });
  return { nodes, links };
}
