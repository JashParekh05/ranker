"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { aggregate, colorFor, initials } from "@/lib/utils";
import type { GroupChat, Ranking } from "@/lib/types";

type AxisKey = "overall" | "controversy" | string; // string = ranking id

export function QuadrantScatter({
  gc,
  rankings,
}: {
  gc: GroupChat;
  rankings: Ranking[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 820, h: 560 });
  const [xKey, setXKey] = useState<AxisKey>("overall");
  const [yKey, setYKey] = useState<AxisKey>("controversy");
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight })
    );
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const agg = useMemo(() => aggregate(gc.people, rankings), [gc, rankings]);

  function value(personId: string, key: AxisKey): number {
    const a = agg.find((x) => x.person.id === personId);
    if (!a) return 0.5;
    if (key === "overall") return a.overall;
    if (key === "controversy") return a.volatility;
    return a.perRanking[key] ?? 0.5;
  }

  const labelFor = (key: AxisKey) =>
    key === "overall"
      ? "Overall standing"
      : key === "controversy"
      ? "Controversy"
      : rankings.find((r) => r.id === key)?.title ?? "Ranking";

  const m = { top: 24, right: 28, bottom: 52, left: 60 };
  const iw = Math.max(10, size.w - m.left - m.right);
  const ih = Math.max(10, size.h - m.top - m.bottom);

  const x = scaleLinear({ domain: [0, 1], range: [0, iw] });
  const y = scaleLinear({ domain: [0, 1], range: [ih, 0] });

  const isSignature = xKey === "overall" && yKey === "controversy";
  const corners = isSignature
    ? {
        tl: "Wildcard",
        tr: "Divisive Icon",
        bl: "Consensus Mid",
        br: "Certified Legend",
      }
    : {
        tl: `Low ${labelFor(xKey)} / High ${labelFor(yKey)}`,
        tr: `High ${labelFor(xKey)} / High ${labelFor(yKey)}`,
        bl: `Low both`,
        br: `High ${labelFor(xKey)} / Low ${labelFor(yKey)}`,
      };

  return (
    <div ref={wrapRef} className="relative h-full w-full bg-[#0a1120]">
      {/* axis selectors */}
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 text-xs">
        <AxisSelect
          label="X"
          value={xKey}
          onChange={setXKey}
          rankings={rankings}
        />
        <AxisSelect
          label="Y"
          value={yKey}
          onChange={setYKey}
          rankings={rankings}
        />
      </div>

      <svg width={size.w} height={size.h}>
        <Group left={m.left} top={m.top}>
          {/* quadrant tints */}
          <rect x={0} y={0} width={iw / 2} height={ih / 2} fill="#1b2740" />
          <rect x={iw / 2} y={0} width={iw / 2} height={ih / 2} fill="#241b40" />
          <rect x={0} y={ih / 2} width={iw / 2} height={ih / 2} fill="#16233a" />
          <rect x={iw / 2} y={ih / 2} width={iw / 2} height={ih / 2} fill="#182a2a" />
          {/* mid lines */}
          <line x1={iw / 2} y1={0} x2={iw / 2} y2={ih} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
          <line x1={0} y1={ih / 2} x2={iw} y2={ih / 2} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />

          {/* corner labels */}
          <CornerLabel x={10} y={18} anchor="start" text={corners.tl} />
          <CornerLabel x={iw - 10} y={18} anchor="end" text={corners.tr} />
          <CornerLabel x={10} y={ih - 10} anchor="start" text={corners.bl} />
          <CornerLabel x={iw - 10} y={ih - 10} anchor="end" text={corners.br} />

          {/* points */}
          {gc.people.map((p) => {
            const px = x(value(p.id, xKey));
            const py = y(value(p.id, yKey));
            const c = colorFor(p.id);
            const isH = hover === p.id;
            return (
              <g
                key={p.id}
                transform={`translate(${px},${py})`}
                onMouseEnter={() => setHover(p.id)}
                onMouseLeave={() => setHover((h) => (h === p.id ? null : h))}
                style={{ cursor: "pointer" }}
              >
                <circle
                  r={isH ? 15 : 11}
                  fill={c}
                  stroke="white"
                  strokeWidth={isH ? 2 : 1}
                  style={{ filter: isH ? `drop-shadow(0 0 8px ${c})` : "none" }}
                />
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize={9}
                  fontWeight={700}
                  fill="white"
                >
                  {initials(p.name)}
                </text>
                <text
                  textAnchor="middle"
                  y={isH ? 30 : 24}
                  fontSize={11}
                  fill="white"
                  style={{ paintOrder: "stroke", stroke: "#0a1120", strokeWidth: 3 }}
                >
                  {p.name}
                </text>
              </g>
            );
          })}

          <AxisBottom
            top={ih}
            scale={x}
            numTicks={4}
            stroke="rgba(255,255,255,0.3)"
            tickStroke="rgba(255,255,255,0.3)"
            tickLabelProps={() => ({ fill: "rgba(255,255,255,0.5)", fontSize: 10, textAnchor: "middle" })}
            label={`${labelFor(xKey)}  (low -> high)`}
            labelProps={{ fill: "rgba(255,255,255,0.75)", fontSize: 12, textAnchor: "middle" }}
          />
          <AxisLeft
            scale={y}
            numTicks={4}
            stroke="rgba(255,255,255,0.3)"
            tickStroke="rgba(255,255,255,0.3)"
            tickLabelProps={() => ({ fill: "rgba(255,255,255,0.5)", fontSize: 10, textAnchor: "end", dx: -4, dy: 3 })}
            label={`${labelFor(yKey)}  (low -> high)`}
            labelProps={{ fill: "rgba(255,255,255,0.75)", fontSize: 12, textAnchor: "middle" }}
          />
        </Group>
      </svg>

      {rankings.length === 0 && (
        <div className="absolute inset-0 grid place-items-center text-white/60">
          Create a ranking to plot people.
        </div>
      )}
    </div>
  );
}

function CornerLabel({
  x,
  y,
  anchor,
  text,
}: {
  x: number;
  y: number;
  anchor: "start" | "end";
  text: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={12}
      fontWeight={700}
      fill="rgba(255,255,255,0.55)"
      style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
    >
      {text}
    </text>
  );
}

function AxisSelect({
  label,
  value,
  onChange,
  rankings,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rankings: Ranking[];
}) {
  return (
    <label className="flex items-center gap-1 rounded-full bg-black/30 px-3 py-1.5 text-white/80 backdrop-blur">
      <span className="font-bold text-white/50">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-white outline-none [&>option]:text-black"
      >
        <option value="overall">Overall standing</option>
        <option value="controversy">Controversy</option>
        {rankings.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title}
          </option>
        ))}
      </select>
    </label>
  );
}
