"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAppData } from "@/lib/useData";
import { TopBar } from "@/components/ui";
import { Constellation } from "@/components/viz/Constellation";
import { SimilarityGraph } from "@/components/viz/SimilarityGraph";
import { QuadrantScatter } from "@/components/viz/QuadrantScatter";
import { ReciprocityGraph } from "@/components/viz/ReciprocityGraph";

type View = "constellation" | "similarity" | "quadrant" | "reciprocity";

export default function MapPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useAppData();
  const [view, setView] = useState<View>("constellation");

  const gc = useMemo(
    () => data?.groupChats.find((g) => g.id === id),
    [data, id]
  );
  const allRankings = useMemo(
    () => (data?.rankings ?? []).filter((r) => r.gcId === id),
    [data, id]
  );
  const categoryRankings = useMemo(
    () => allRankings.filter((r) => r.kind !== "personal"),
    [allRankings]
  );
  const personal = useMemo(
    () => allRankings.filter((r) => r.kind === "personal"),
    [allRankings]
  );

  if (loading) return null;
  if (!gc)
    return (
      <main>
        <TopBar title="Not found" back={{ href: `/gc/${id}` }} />
      </main>
    );

  const tabs: { id: View; label: string }[] = [
    { id: "constellation", label: "Constellation" },
    { id: "similarity", label: "Similarity" },
    { id: "quadrant", label: "Quadrant" },
    ...(personal.length > 0
      ? [{ id: "reciprocity" as View, label: "Reciprocity" }]
      : []),
  ];

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#070d1a]">
      <div className="border-b border-white/10 bg-[#0a1120]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5">
          <a
            href={`/gc/${gc.id}`}
            className="shrink-0 rounded-full px-2.5 py-1.5 text-base font-semibold text-brand-200 transition hover:bg-white/10"
            aria-label="Back"
          >
            {"<"}
          </a>
          <div className="no-scrollbar flex flex-1 gap-1 overflow-x-auto rounded-full bg-white/5 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={
                  "shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition " +
                  (view === t.id
                    ? "bg-white text-[#0a1120]"
                    : "text-white/70 hover:text-white")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[calc(100dvh-53px)]">
        {view === "constellation" && (
          <Constellation gc={gc} rankings={categoryRankings} />
        )}
        {view === "similarity" && (
          <SimilarityGraph gc={gc} rankings={categoryRankings} />
        )}
        {view === "quadrant" && (
          <QuadrantScatter gc={gc} rankings={categoryRankings} />
        )}
        {view === "reciprocity" && (
          <ReciprocityGraph gc={gc} personal={personal} />
        )}
      </div>
    </main>
  );
}
