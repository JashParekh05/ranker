"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { aggregate, colorFor, initials, standing } from "@/lib/utils";
import type { GroupChat, Ranking } from "@/lib/types";

type Pt = { x: number; y: number };
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

export function Constellation({
  gc,
  rankings,
}: {
  gc: GroupChat;
  rankings: Ranking[];
}) {
  const [mode, setMode] = useState<string>("overall");
  const [size, setSize] = useState({ w: 900, h: 600 });
  const [pos, setPos] = useState<Record<string, Pt>>({});
  const [hover, setHover] = useState<string | null>(null);
  const [relayoutKey, setRelayoutKey] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pid: string; dx: number; dy: number } | null>(null);

  const aggregates = useMemo(
    () => aggregate(gc.people, rankings),
    [gc, rankings]
  );

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight })
    );
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const active =
      mode === "overall" ? null : rankings.find((r) => r.id === mode) ?? null;
    const cx = size.w / 2;
    const cy = size.h / 2;
    const maxR = Math.min(size.w, size.h) / 2 - 70;
    const minR = 90;
    const scored = aggregates
      .map((a) => ({
        a,
        score: active ? standing(active, a.person.id) ?? 0 : a.overall,
      }))
      .sort((x, y) => y.score - x.score);
    const next: Record<string, Pt> = {};
    const n = scored.length;
    scored.forEach(({ a, score }, i) => {
      const angle = i * GOLDEN;
      const r = minR + (1 - score) * (maxR - minR) + (i / Math.max(1, n)) * 24;
      next[a.person.id] = { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    });
    setPos(next);
  }, [mode, size.w, size.h, aggregates, rankings, relayoutKey]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = drag.current;
      const el = boardRef.current;
      if (!d || !el) return;
      const rect = el.getBoundingClientRect();
      setPos((prev) => ({
        ...prev,
        [d.pid]: { x: e.clientX - rect.left - d.dx, y: e.clientY - rect.top - d.dy },
      }));
    }
    const onUp = () => (drag.current = null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const active = mode === "overall" ? null : rankings.find((r) => r.id === mode) ?? null;
  const cx = size.w / 2;
  const cy = size.h / 2;
  const scoreOf = (pid: string) =>
    active
      ? standing(active, pid) ?? 0
      : aggregates.find((a) => a.person.id === pid)?.overall ?? 0.5;

  const ranked = [...gc.people]
    .map((x) => ({ id: x.id, s: scoreOf(x.id) }))
    .sort((a, b) => b.s - a.s);
  const rankOf = (pid: string) => ranked.findIndex((x) => x.id === pid) + 1;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 px-5 py-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-white/50">
          Orbit by
        </span>
        <Pill active={mode === "overall"} onClick={() => setMode("overall")}>
          Overall
        </Pill>
        {rankings.map((r) => (
          <Pill key={r.id} active={mode === r.id} onClick={() => setMode(r.id)}>
            {r.title}
          </Pill>
        ))}
        <button
          onClick={() => setRelayoutKey((k) => k + 1)}
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-white/60 transition hover:bg-white/10"
        >
          Re-layout
        </button>
      </div>

      <div
        ref={boardRef}
        className="relative w-full flex-1 overflow-hidden"
        style={{
          background:
            "radial-gradient(900px 700px at 50% 45%, #12324a 0%, #0c1b30 45%, #070d1a 100%)",
        }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {gc.people.map((p) => {
            const pt = pos[p.id];
            if (!pt) return null;
            const s = scoreOf(p.id);
            return (
              <line
                key={p.id}
                x1={cx}
                y1={cy}
                x2={pt.x}
                y2={pt.y}
                stroke={colorFor(p.id)}
                strokeOpacity={hover === p.id ? 0.85 : 0.22 + s * 0.35}
                strokeWidth={hover === p.id ? 2.5 : 1 + s * 1.5}
              />
            );
          })}
        </svg>

        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: cx, top: cy }}
        >
          <div
            className="grid h-24 w-24 place-items-center rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 45%, #ffe6b8 0%, #f0a94e 55%, #b9701f 100%)",
              boxShadow: "0 0 60px 18px rgba(255,190,110,0.35)",
            }}
          >
            <span className="px-2 text-center font-display text-[11px] font-700 leading-tight text-[#3a2408]">
              {active ? active.title : gc.name}
            </span>
          </div>
        </div>

        {gc.people.map((p) => {
          const pt = pos[p.id] ?? { x: cx, y: cy };
          const s = scoreOf(p.id);
          const base = 40 + s * 26;
          const isHover = hover === p.id;
          const c = colorFor(p.id);
          return (
            <motion.div
              key={p.id}
              className="absolute cursor-grab select-none active:cursor-grabbing"
              style={{ left: pt.x, top: pt.y, touchAction: "none" }}
              initial={false}
              animate={{ x: "-50%", y: "-50%", scale: isHover ? 1.4 : 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              onPointerDown={(e) => {
                const rect = boardRef.current!.getBoundingClientRect();
                drag.current = {
                  pid: p.id,
                  dx: e.clientX - rect.left - pt.x,
                  dy: e.clientY - rect.top - pt.y,
                };
              }}
              onPointerEnter={() => setHover(p.id)}
              onPointerLeave={() => setHover((h) => (h === p.id ? null : h))}
            >
              <div
                className="grid place-items-center rounded-full font-bold text-white"
                style={{
                  width: base,
                  height: base,
                  background: `radial-gradient(circle at 35% 30%, ${c}, rgba(0,0,0,0.35)), ${c}`,
                  boxShadow: `0 0 ${isHover ? 34 : 16}px ${isHover ? 10 : 4}px ${c}66, inset 0 0 12px rgba(255,255,255,0.25)`,
                  zIndex: isHover ? 40 : 10,
                }}
              >
                <span className="text-sm drop-shadow">{initials(p.name)}</span>
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-bold text-ink shadow">
                  {rankOf(p.id)}
                </span>
              </div>
              <div
                className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-center text-[11px] font-semibold text-white"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)", opacity: isHover ? 1 : 0.8 }}
              >
                {p.name}
              </div>
            </motion.div>
          );
        })}

        {gc.people.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-white/60">
            Add people to the roster to see the constellation.
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-3 py-1.5 text-sm font-semibold transition " +
        (active ? "bg-white text-[#0a1120] shadow" : "bg-white/10 text-white/80 hover:bg-white/20")
      }
    >
      {children}
    </button>
  );
}
