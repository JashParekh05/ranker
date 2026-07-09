"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { useAppData } from "@/lib/useData";
import { Button, TopBar } from "@/components/ui";
import { aggregate, colorFor, initials, standing } from "@/lib/utils";
import type { Ranking } from "@/lib/types";

type Pt = { x: number; y: number };
const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // ~137.5deg

export default function MapPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useAppData();

  const gc = useMemo(
    () => data?.groupChats.find((g) => g.id === id),
    [data, id]
  );
  const rankings = useMemo(
    () => (data?.rankings ?? []).filter((r) => r.gcId === id),
    [data, id]
  );

  const [mode, setMode] = useState<string>("overall");
  const [size, setSize] = useState({ w: 900, h: 600 });
  const [pos, setPos] = useState<Record<string, Pt>>({});
  const [hover, setHover] = useState<string | null>(null);
  const [relayoutKey, setRelayoutKey] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pid: string; dx: number; dy: number } | null>(null);

  const aggregates = useMemo(
    () => (gc ? aggregate(gc.people, rankings) : []),
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
  }, [loading]);

  // radial constellation layout: rank 1 closest to the hub
  useEffect(() => {
    if (!gc) return;
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
      // higher score => smaller radius (closer to center)
      const r = minR + (1 - score) * (maxR - minR);
      // small spiral growth so equal scores fan out
      const rr = r + (i / Math.max(1, n)) * 24;
      next[a.person.id] = { x: cx + Math.cos(angle) * rr, y: cy + Math.sin(angle) * rr };
    });
    setPos(next);
  }, [mode, size.w, size.h, aggregates, gc, rankings, relayoutKey]);

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

  if (loading) return null;
  if (!gc)
    return (
      <main>
        <TopBar title="Not found" back={{ href: `/gc/${id}` }} />
      </main>
    );

  const active: Ranking | null =
    mode === "overall" ? null : rankings.find((r) => r.id === mode) ?? null;
  const cx = size.w / 2;
  const cy = size.h / 2;

  const scoreOf = (pid: string) =>
    active ? standing(active, pid) ?? 0 : aggregates.find((a) => a.person.id === pid)?.overall ?? 0.5;

  const top = [...gc.people]
    .map((p) => ({ p, s: scoreOf(p.id) }))
    .sort((a, b) => b.s - a.s)[0];
  const avg =
    aggregates.length > 0
      ? Math.round(
          (aggregates.reduce((s, a) => s + a.overall, 0) / aggregates.length) * 100
        )
      : 0;

  return (
    <main className="h-screen overflow-hidden bg-[#0a1120]">
      <div className="border-b border-white/10 bg-[#0a1120]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3">
          <a
            href={`/gc/${gc.id}`}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand-200 transition hover:bg-white/10"
          >
            {"< "}
            {gc.name}
          </a>
          <span className="font-display text-lg font-700 text-white">
            Constellation
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
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
        </div>
      </div>

      <div
        ref={boardRef}
        className="relative h-[calc(100vh-56px)] w-full overflow-hidden"
        style={{
          background:
            "radial-gradient(900px 700px at 50% 45%, #12324a 0%, #0c1b30 45%, #070d1a 100%)",
        }}
      >
        {/* connecting beams */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffd9a0" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffd9a0" stopOpacity="0" />
            </radialGradient>
          </defs>
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

        {/* central hub */}
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

        {/* person nodes */}
        {gc.people.map((p) => {
          const pt = pos[p.id] ?? { x: cx, y: cy };
          const s = scoreOf(p.id);
          const base = 40 + s * 26;
          const isHover = hover === p.id;
          const rank =
            [...gc.people]
              .map((x) => ({ id: x.id, s: scoreOf(x.id) }))
              .sort((a, b) => b.s - a.s)
              .findIndex((x) => x.id === p.id) + 1;
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
                  {rank}
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

        {/* legend */}
        <div className="absolute bottom-4 left-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
            Legend
          </div>
          <div className="text-xs text-white/80">Closer to center = higher rank</div>
          <div className="text-xs text-white/80">Bigger + brighter = higher rank</div>
          <div className="mt-1 text-xs text-white/60">
            {active ? `Orbiting: ${active.title}` : "Orbiting: Overall standing"}
          </div>
        </div>

        {/* stat HUD */}
        <div className="absolute bottom-4 right-4 flex gap-5 rounded-2xl border border-white/10 bg-black/30 px-5 py-3 backdrop-blur">
          <Stat label="People" value={String(gc.people.length)} />
          <Stat label="Rankings" value={String(rankings.length)} />
          <Stat label="Avg standing" value={`${avg}%`} />
          {top && <Stat label="On top" value={top.p.name} />}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/45">
        {label}
      </div>
      <div className="font-display text-lg font-700 text-white">{value}</div>
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
        (active
          ? "bg-white text-[#0a1120] shadow"
          : "bg-white/10 text-white/80 hover:bg-white/20")
      }
    >
      {children}
    </button>
  );
}
