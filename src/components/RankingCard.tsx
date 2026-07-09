"use client";

import Link from "next/link";
import { Card } from "@/components/ui";
import { Tilt } from "@/components/Tilt";
import { colorFor, initials } from "@/lib/utils";
import type { GroupChat, Ranking } from "@/lib/types";

function movement(r: Ranking, pid: string, i: number): number {
  if (!r.prevOrder || r.prevOrder.length === 0) return 0;
  const prev = r.prevOrder.indexOf(pid);
  if (prev < 0) return 0;
  return prev - i; // + = moved up
}

function Delta({ d }: { d: number }) {
  if (d === 0) return null;
  const up = d > 0;
  return (
    <span
      className={
        "ml-1 text-[10px] font-bold " + (up ? "text-emerald-500" : "text-red-500")
      }
    >
      {up ? `\u25B2${d}` : `\u25BC${-d}`}
    </span>
  );
}

function Avatar({
  pid,
  name,
  size,
}: {
  pid: string;
  name: string;
  size: number;
}) {
  return (
    <span
      className="grid place-items-center rounded-full font-bold text-white ring-2 ring-white"
      style={{
        width: size,
        height: size,
        background: colorFor(pid),
        fontSize: size * 0.34,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function RankingCard({
  gc,
  ranking,
  pending,
}: {
  gc: GroupChat;
  ranking: Ranking;
  pending: number;
}) {
  const byId = new Map(gc.people.map((p) => [p.id, p]));
  const placed = ranking.order.filter((id) => byId.has(id));
  const top = placed.slice(0, 3).map((id) => byId.get(id)!);
  const rest = placed.slice(3, 6).map((id, k) => ({ p: byId.get(id)!, i: k + 3 }));
  const medals = ["#f5c542", "#c8cdd6", "#d68a5b"]; // gold silver bronze

  return (
    <Link href={`/gc/${gc.id}/rank/${ranking.id}`}>
      <Tilt>
        <Card className="p-5 transition hover:shadow-pop">
          <div className="mb-1 flex items-center justify-between gap-2">
          <div className="truncate font-display text-lg font-700 text-ink">
            {ranking.title}
          </div>
          {pending > 0 && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {pending} pending
            </span>
          )}
        </div>
        <div className="mb-4 text-xs text-muted">by {ranking.author}</div>

        {placed.length === 0 ? (
          <div className="flex items-end justify-center gap-3 rounded-xl border border-dashed border-white/10 py-6 text-muted">
            <div className="flex flex-col items-center gap-1 opacity-50">
              <span className="h-9 w-9 rounded-full border border-dashed border-white/15" />
              <span className="h-10 w-8 rounded-t-md bg-white/10" />
            </div>
            <div className="flex flex-col items-center gap-1 opacity-70">
              <span className="h-11 w-11 rounded-full border border-dashed border-white/15" />
              <span className="h-16 w-8 rounded-t-md bg-white/10" />
            </div>
            <div className="flex flex-col items-center gap-1 opacity-50">
              <span className="h-9 w-9 rounded-full border border-dashed border-white/15" />
              <span className="h-8 w-8 rounded-t-md bg-white/10" />
            </div>
          </div>
        ) : (
          <>
            {/* podium */}
            <div className="mb-3 flex items-end justify-center gap-4">
              {/* silver (2) */}
              {top[1] && (
                <Podium
                  place={2}
                  color={medals[1]}
                  person={top[1]}
                  h={48}
                  size={40}
                  delta={<Delta d={movement(ranking, top[1].id, 1)} />}
                />
              )}
              {/* gold (1) */}
              {top[0] && (
                <Podium
                  place={1}
                  color={medals[0]}
                  person={top[0]}
                  h={66}
                  size={52}
                  delta={<Delta d={movement(ranking, top[0].id, 0)} />}
                />
              )}
              {/* bronze (3) */}
              {top[2] && (
                <Podium
                  place={3}
                  color={medals[2]}
                  person={top[2]}
                  h={36}
                  size={40}
                  delta={<Delta d={movement(ranking, top[2].id, 2)} />}
                />
              )}
            </div>

            {/* runners up */}
            {rest.length > 0 && (
              <ol className="space-y-1 text-sm">
                {rest.map(({ p, i }) => (
                  <li key={p.id} className="flex items-center gap-2 text-ink">
                    <span className="w-4 text-muted">{i + 1}</span>
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: colorFor(p.id) }}
                    />
                    <span className="flex-1 truncate">{p.name}</span>
                    <Delta d={movement(ranking, p.id, i)} />
                  </li>
                ))}
              </ol>
            )}
            {placed.length > 6 && (
              <div className="mt-1 pl-6 text-sm text-muted">
                +{placed.length - 6} more
              </div>
            )}
          </>
        )}
      </Card>
      </Tilt>
    </Link>
  );
}

function Podium({
  place,
  color,
  person,
  h,
  size,
  delta,
}: {
  place: number;
  color: string;
  person: { id: string; name: string };
  h: number;
  size: number;
  delta: React.ReactNode;
}) {
  return (
    <div className="flex w-16 flex-col items-center gap-1">
      <div className="relative">
        <span
          className="grid place-items-center rounded-full font-bold text-white ring-2"
          style={{
            width: size,
            height: size,
            background: colorFor(person.id),
            fontSize: size * 0.34,
            boxShadow: `0 0 0 3px ${color}`,
          }}
        >
          {initials(person.name)}
        </span>
        <span
          className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white"
          style={{ background: color }}
        >
          {place}
        </span>
      </div>
      <span className="max-w-full truncate text-xs font-semibold text-ink">
        {person.name}
        {delta}
      </span>
      <div
        className="w-9 rounded-t-md"
        style={{ height: h, background: `${color}55` }}
      />
    </div>
  );
}
