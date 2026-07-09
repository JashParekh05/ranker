"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { buildReciprocity } from "@/lib/graph";
import { colorFor } from "@/lib/utils";
import type { GroupChat, Ranking } from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

export function ReciprocityGraph({
  gc,
  personal,
}: {
  gc: GroupChat;
  personal: Ranking[]; // all kind==="personal" rows for this gc
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });

  // distinct prompt titles (from markers or ballots)
  const prompts = useMemo(
    () => Array.from(new Set(personal.map((r) => r.title))),
    [personal]
  );
  const [prompt, setPrompt] = useState<string>(prompts[0] ?? "");
  useEffect(() => {
    if (!prompt && prompts[0]) setPrompt(prompts[0]);
  }, [prompts, prompt]);

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

  const ballots = useMemo(
    () =>
      personal.filter((r) => r.rater != null && r.title === prompt),
    [personal, prompt]
  );

  const data = useMemo(
    () => buildReciprocity(gc, ballots),
    [gc, ballots]
  );
  const graphData = useMemo(
    () => ({
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.links.map((l) => ({ ...l })),
    }),
    [data]
  );

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-xs text-white/80 backdrop-blur">
        <span className="font-semibold text-white/50">Prompt</span>
        <select
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="bg-transparent text-white outline-none [&>option]:text-black"
        >
          {prompts.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="text-white/50">{ballots.length} ballots</span>
      </div>

      <div className="absolute bottom-4 left-4 z-10 max-w-xs rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/75 backdrop-blur">
        Arrows point from a person to someone they ranked highly. Red arrows are
        one-sided: A rates B high, but B does not return it. Bigger nodes are
        ranked highly by more people.
      </div>

      {ballots.length === 0 && (
        <div className="absolute inset-0 z-0 grid place-items-center text-white/60">
          No ballots submitted yet for this prompt.
        </div>
      )}

      <ForceGraph2D
        graphData={graphData}
        width={size.w}
        height={size.h}
        backgroundColor="#070d1a"
        cooldownTicks={140}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.9}
        linkCurvature={0.15}
        linkWidth={(l: any) => 0.5 + (l.weight ?? 0) * 3}
        linkColor={(l: any) =>
          (l.asym ?? 0) > 0.4 ? "rgba(255,90,110,0.75)" : "rgba(150,200,255,0.4)"
        }
        nodeRelSize={6}
        nodeVal={(n: any) => 1 + (n.score ?? 0.5) * 6}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, scale: number) => {
          const x = node.x ?? 0;
          const y = node.y ?? 0;
          const r = 5 + (node.score ?? 0.5) * 10;
          const c = colorFor(node.id ?? "");
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 2 * Math.PI);
          ctx.fillStyle = c;
          ctx.shadowColor = c;
          ctx.shadowBlur = 16;
          ctx.fill();
          ctx.shadowBlur = 0;
          const fs = 12 / scale;
          ctx.font = `${fs}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fillText(node.name ?? "", x, y + r + 2);
        }}
      />
    </div>
  );
}
