import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Person, Ranking } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalized standing of a person within one ranking.
 * Returns 1.0 for rank 1 (top), 0.0 for last. null if not present.
 */
export function standing(ranking: Ranking, personId: string): number | null {
  const idx = ranking.order.indexOf(personId);
  if (idx < 0) return null;
  const n = ranking.order.length;
  if (n <= 1) return 1;
  return 1 - idx / (n - 1);
}

export type PersonAggregate = {
  person: Person;
  /** mean standing across all rankings the person appears in (0..1) */
  overall: number;
  /** how much their standing varies across categories (0..1) */
  volatility: number;
  /** per-ranking standing keyed by ranking id */
  perRanking: Record<string, number>;
  appearances: number;
};

export function aggregate(
  people: Person[],
  rankings: Ranking[]
): PersonAggregate[] {
  return people.map((person) => {
    const perRanking: Record<string, number> = {};
    const vals: number[] = [];
    for (const r of rankings) {
      const s = standing(r, person.id);
      if (s !== null) {
        perRanking[r.id] = s;
        vals.push(s);
      }
    }
    const overall =
      vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.5;
    const mean = overall;
    const variance =
      vals.length > 1
        ? vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length
        : 0;
    const volatility = Math.min(1, Math.sqrt(variance) * 2);
    return {
      person,
      overall,
      volatility,
      perRanking,
      appearances: vals.length,
    };
  });
}

/** Deterministic pastel color from a string, for node identity. */
export function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `hsl(${h}, 70%, 62%)`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
