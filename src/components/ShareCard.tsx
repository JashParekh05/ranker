"use client";

import { forwardRef } from "react";
import { toPng } from "html-to-image";
import { colorFor, initials } from "@/lib/utils";
import type { GroupChat, Ranking } from "@/lib/types";

/**
 * A solid-color (no backdrop-filter) portrait card designed to rasterize
 * cleanly to PNG for sharing. Rendered off-screen and captured on demand.
 */
export const ShareCard = forwardRef<
  HTMLDivElement,
  { gc: GroupChat; ranking: Ranking }
>(function ShareCard({ gc, ranking }, ref) {
  const byId = new Map(gc.people.map((p) => [p.id, p]));
  const placed = ranking.order
    .map((id) => byId.get(id))
    .filter(Boolean) as { id: string; name: string }[];
  const top = placed.slice(0, 3);
  const rest = placed.slice(3); // everyone below the podium
  const medals = ["#f5c542", "#c8cdd6", "#d68a5b"];

  const Bar = ({ h, c, person, place }: { h: number; c: string; person: { id: string; name: string }; place: number }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 130 }}>
      <div style={{ position: "relative" }}>
        <div
          style={{
            width: place === 1 ? 84 : 64,
            height: place === 1 ? 84 : 64,
            borderRadius: "50%",
            background: colorFor(person.id),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: place === 1 ? 30 : 24,
            boxShadow: `0 0 0 5px ${c}`,
          }}
        >
          {initials(person.name)}
        </div>
        <div
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: c,
            color: "#1a1020",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
          }}
        >
          {place}
        </div>
      </div>
      <div style={{ marginTop: 10, color: "#fff", fontWeight: 700, fontSize: 22, maxWidth: 126, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {person.name}
      </div>
      <div style={{ marginTop: 8, width: 56, height: h, borderRadius: "10px 10px 0 0", background: `${c}66` }} />
    </div>
  );

  return (
    <div
      ref={ref}
      style={{
        width: 540,
        minHeight: 675,
        padding: 40,
        boxSizing: "border-box",
        fontFamily: "var(--font-sans), system-ui, sans-serif",
        color: "#fff",
        background:
          "radial-gradient(600px 400px at 15% 0%, #6d28d9 0%, transparent 60%), radial-gradient(500px 400px at 100% 100%, #0d9488 0%, transparent 55%), radial-gradient(500px 400px at 90% 0%, #db2777 0%, transparent 55%), #14121c",
      }}
    >
      <div style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
        {gc.name}
      </div>
      <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.05, marginTop: 4, fontFamily: "var(--font-display), sans-serif" }}>
        {ranking.title}
      </div>
      <div style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", marginTop: 6 }}>
        ranked by {ranking.author}
      </div>

      {placed.length === 0 ? (
        <div style={{ marginTop: 60, textAlign: "center", color: "rgba(255,255,255,0.6)" }}>
          No one ranked yet.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 18, marginTop: 44 }}>
            {top[1] && <Bar h={64} c={medals[1]} person={top[1]} place={2} />}
            {top[0] && <Bar h={92} c={medals[0]} person={top[0]} place={1} />}
            {top[2] && <Bar h={44} c={medals[2]} person={top[2]} place={3} />}
          </div>

          {rest.length > 0 && (
            <div style={{ marginTop: 36 }}>
              {rest.map((p, k) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                  <div style={{ width: 26, color: "rgba(255,255,255,0.55)", fontWeight: 700, fontSize: 18 }}>{k + 4}</div>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: colorFor(p.id) }} />
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{p.name}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 40, fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
        ranker-brown.vercel.app
      </div>
    </div>
  );
});

/** Rasterize a node to PNG and share (Web Share files) or download. */
export async function exportCard(node: HTMLElement, filename: string) {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], `${filename}.png`, { type: "image/png" });

  const nav = navigator as Navigator & {
    canShare?: (d: { files: File[] }) => boolean;
  };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch {
      /* user cancelled or share failed -> fall through to download */
    }
  }
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${filename}.png`;
  a.click();
}
