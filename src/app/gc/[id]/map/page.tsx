"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { useAppData } from "@/lib/useData";
import { Button, TopBar } from "@/components/ui";
import { aggregate, colorFor, initials, standing } from "@/lib/utils";
import type { Ranking } from "@/lib/types";

type Pt = { x: number; y: number };
const MARGIN = 70;

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

  // "overall" or a specific ranking id
  const [mode, setMode] = useState<string>("overall");
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 900, h: 560 });
  const [pos, setPos] = useState<Record<string, Pt>>({});
  const [hover, setHover] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pid: string; dx: number; dy: number } | null>(null);
  const [relayoutKey, setRelayoutKey] = useState(0);

  const aggregates = useMemo(
    () => (gc ? aggregate(gc.people, rankings) : []),
    [gc, rankings]
  );

  // measure board
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [loading]);

  // compute target positions when mode / size / data change
  useEffect(() => {
    if (!gc) return;
    const activeRanking =
      mode === "overall" ? null : rankings.find((r) => r.id === mode) ?? null;
    const next: Record<string, Pt> = {};
    const innerW = Math.max(1, size.w - MARGIN * 2);
    const innerH = Math.max(1, size.h - MARGIN * 2);

    for (const a of aggregates) {
      let nx: number; // 0..1 left->right
      let ny: number; // 0..1 top->bottom
      if (activeRanking) {
        // x = standing in this category (right = top ranked)
        const s = standing(activeRanking, a.person.id);
        nx = s ?? 0.5;
        // y = overall standing (top = high overall)
        ny = 1 - a.overall;
      } else {
        // overall map: x = overall standing, y = volatility (top = consistent)
        nx = a.overall;
        ny = a.volatility;
      }
      // gentle deterministic jitter so equal values do not stack
      const j = (parseInt(a.person.id.slice(0, 4), 16) % 100) / 100;
      const jitter = (j - 0.5) * 40;
      next[a.person.id] = {
        x: MARGIN + nx * innerW + jitter,
        y: MARGIN + ny * innerH + jitter * 0.6,
      };
    }
    setPos(next);
  }, [mode, size.w, size.h, aggregates, gc, rankings, relayoutKey]);

  // manual drag handlers
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = drag.current;
      const el = boardRef.current;
      if (!d || !el) return;
      const rect = el.getBoundingClientRect();
      setPos((prev) => ({
        ...prev,
        [d.pid]: {
          x: e.clientX - rect.left - d.dx,
          y: e.clientY - rect.top - d.dy,
        },
      }));
    }
    function onUp() {
      drag.current = null;
    }
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

  const activeRanking: Ranking | null =
    mode === "overall" ? null : rankings.find((r) => r.id === mode) ?? null;

  const axis = activeRanking
    ? { x: `${activeRanking.title}  (low -> high)`, y: "Overall standing" }
    : { x: "Overall standing  (low -> high)", y: "Consistency -> volatility" };

  return (
    <main className="h-screen overflow-hidden">
      <TopBar
        title={`${gc.name}  ~  Map`}
        back={{ href: `/gc/${gc.id}`, label: gc.name }}
        right={
          <Button variant="ghost" onClick={() => setRelayoutKey((k) => k + 1)}>
            Re-layout
          </Button>
        }
      />

      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-5 py-3">
        <span className="mr-1 text-sm font-semibold text-muted">
          Position by
        </span>
        <Pill active={mode === "overall"} onClick={() => setMode("overall")}>
          Overall
        </Pill>
        {rankings.map((r) => (
          <Pill key={r.id} active={mode === r.id} onClick={() => setMode(r.id)}>
            {r.title}
          </Pill>
        ))}
        {rankings.length === 0 && (
          <span className="text-sm text-muted">
            No rankings yet, nodes will cluster in the center. Create a ranking
            to spread them out.
          </span>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-6">
        <div
          ref={boardRef}
          className="relative h-[calc(100vh-190px)] w-full overflow-hidden rounded-xl2 border border-brand-100 bg-white/50 shadow-soft"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.10) 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        >
          {/* axis labels */}
          <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-medium text-muted">
            {axis.x}
          </span>
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted">
            {axis.y}
          </span>

          {gc.people.map((p) => {
            const pt = pos[p.id] ?? { x: size.w / 2, y: size.h / 2 };
            const agg = aggregates.find((a) => a.person.id === p.id);
            const base = 44 + (agg ? agg.overall * 22 : 0);
            const isHover = hover === p.id;
            return (
              <motion.div
                key={p.id}
                className="absolute cursor-grab select-none active:cursor-grabbing"
                style={{ left: pt.x, top: pt.y, touchAction: "none" }}
                initial={false}
                animate={{ x: "-50%", y: "-50%", scale: isHover ? 1.35 : 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
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
                  className="grid place-items-center rounded-full font-bold text-white shadow-pop ring-2 ring-white"
                  style={{
                    width: base,
                    height: base,
                    background: colorFor(p.id),
                    zIndex: isHover ? 30 : 10,
                  }}
                >
                  <span className="text-sm">{initials(p.name)}</span>
                </div>
                <div
                  className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/85 px-2 py-0.5 text-center text-[11px] font-semibold text-white"
                  style={{ opacity: isHover ? 1 : 0.85 }}
                >
                  {p.name}
                  {agg && isHover && (
                    <span className="ml-1 font-normal text-brand-200">
                      {Math.round(agg.overall * 100)}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}

          {gc.people.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-muted">
              Add people to the roster to see them on the map.
            </div>
          )}
        </div>
      </div>
    </main>
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
        "rounded-full px-3.5 py-1.5 text-sm font-semibold transition " +
        (active
          ? "bg-brand-600 text-white shadow-pop"
          : "bg-white text-brand-700 hover:bg-brand-50")
      }
    >
      {children}
    </button>
  );
}
