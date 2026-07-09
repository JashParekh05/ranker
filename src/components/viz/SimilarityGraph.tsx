"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { buildSimilarityGraph } from "@/lib/graph";
import { colorFor } from "@/lib/utils";
import type { GroupChat, Ranking } from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

export function SimilarityGraph({
  gc,
  rankings,
}: {
  gc: GroupChat;
  rankings: Ranking[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });
  const [threshold, setThreshold] = useState(0.62);

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

  const data = useMemo(
    () => buildSimilarityGraph(gc, rankings, threshold),
    [gc, rankings, threshold]
  );

  // react-force-graph mutates the objects, so clone per render input
  const graphData = useMemo(
    () => ({
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.links.map((l) => ({ ...l })),
    }),
    [data]
  );

  const enoughData = rankings.length >= 2;

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      {!enoughData && (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/40 px-4 py-2 text-xs text-white/80 backdrop-blur">
          Add at least 2 rankings for meaningful similarity links.
        </div>
      )}

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-xs text-white/80 backdrop-blur">
        <span>Link sensitivity</span>
        <input
          type="range"
          min={0.3}
          max={0.95}
          step={0.01}
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
        />
        <span className="w-8 tabular-nums">{Math.round(threshold * 100)}%</span>
      </div>

      <div className="absolute bottom-4 left-4 z-10 max-w-xs rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/75 backdrop-blur">
        Each dot is a person. A line connects two people who are ranked
        similarly across your categories. Tighter clusters = friends the group
        sees the same way. Drag nodes, scroll to zoom.
      </div>

      <ForceGraph2D
        graphData={graphData}
        width={size.w}
        height={size.h}
        backgroundColor="#070d1a"
        cooldownTicks={120}
        d3VelocityDecay={0.3}
        linkColor={() => "rgba(160,140,255,0.35)"}
        linkWidth={(l: any) => 0.5 + (l.similarity ?? 0) * 4}
        nodeRelSize={6}
        nodeVal={(n: any) => 1 + (n.score ?? 0.5) * 6}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, scale: number) => {
          const x = node.x ?? 0;
          const y = node.y ?? 0;
          const r = 5 + (node.score ?? 0.5) * 10;
          const c = colorFor(node.id ?? "");
          // glow
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 2 * Math.PI);
          ctx.fillStyle = c;
          ctx.shadowColor = c;
          ctx.shadowBlur = 16;
          ctx.fill();
          ctx.shadowBlur = 0;
          // label
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
