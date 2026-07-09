"use client";

import { Reorder } from "motion/react";
import { colorFor, initials } from "@/lib/utils";
import type { Person } from "@/lib/types";

/**
 * Slot-filler: a pool of unranked name bubbles + numbered draggable slots +
 * empty placeholder slots. Tap a bubble to place, drag to reorder, tap x to
 * remove. `disabled` renders a read-only standings list.
 */
export function RankBuilder({
  order,
  roster,
  onChange,
  disabled,
}: {
  order: string[];
  roster: Person[];
  onChange?: (next: string[]) => void;
  disabled?: boolean;
}) {
  const peopleById = new Map(roster.map((p) => [p.id, p]));
  const unranked = roster.filter((p) => !order.includes(p.id));
  const emptyCount = Math.max(0, roster.length - order.length);
  const emit = onChange ?? (() => {});

  return (
    <div>
      {!disabled && (
        <div className="mb-5">
          <div className="mb-2 text-xs font-semibold text-muted">
            {unranked.length > 0
              ? "Tap a name to drop it into the next open slot"
              : "Everyone is placed. Drag rows to reorder."}
          </div>
          <div className="flex flex-wrap gap-2">
            {unranked.map((p) => (
              <button
                key={p.id}
                onClick={() => emit([...order, p.id])}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-ink shadow-soft transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-pop"
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
        </div>
      )}

      <Reorder.Group axis="y" values={order} onReorder={emit} className="space-y-2">
        {order.map((pid, i) => {
          const p = peopleById.get(pid);
          if (!p) return null;
          return (
            <Reorder.Item
              key={pid}
              value={pid}
              dragListener={!disabled}
              style={{ touchAction: disabled ? "auto" : "none" }}
              whileDrag={{
                scale: 1.03,
                boxShadow: "0 12px 30px -8px rgba(124,58,237,0.45)",
              }}
              className={
                "flex select-none items-center gap-3 rounded-xl2 border border-white/10 bg-white/[0.06] px-4 py-3 shadow-soft " +
                (disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing")
              }
            >
              <span className="w-6 text-center font-display text-lg font-700 text-brand-300">
                {i + 1}
              </span>
              <span
                className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white"
                style={{ background: colorFor(pid) }}
              >
                {initials(p.name)}
              </span>
              <span className="flex-1 font-medium text-ink">{p.name}</span>
              {!disabled && (
                <>
                  <span className="text-lg leading-none text-brand-300" aria-hidden>
                    {"\u2630"}
                  </span>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => emit(order.filter((x) => x !== pid))}
                    className="ml-1 grid h-6 w-6 place-items-center rounded-full text-muted transition hover:bg-red-50 hover:text-red-500"
                    aria-label={`Remove ${p.name}`}
                  >
                    x
                  </button>
                </>
              )}
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {!disabled && emptyCount > 0 && (
        <div className="mt-2 space-y-2">
          {Array.from({ length: emptyCount }).map((_, k) => (
            <div
              key={k}
              className="flex items-center gap-3 rounded-xl2 border border-dashed border-white/10 px-4 py-3 text-muted"
            >
              <span className="w-6 text-center font-display text-lg font-700 text-brand-300">
                {order.length + k + 1}
              </span>
              <span className="h-9 w-9 rounded-full border border-dashed border-white/10" />
              <span className="text-sm">empty slot</span>
            </div>
          ))}
        </div>
      )}

      {disabled && order.length === 0 && (
        <div className="rounded-xl2 border border-dashed border-white/10 p-6 text-center text-sm text-muted">
          No one has been ranked yet.
        </div>
      )}
    </div>
  );
}
