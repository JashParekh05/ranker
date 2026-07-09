"use client";

import { useCallback, useEffect, useState } from "react";
import { store, supabase, isRemote } from "./store";
import type { AppData } from "./types";

/** Subscribe to the whole data blob; re-renders on any local or remote change. */
export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);

  const refresh = useCallback(() => {
    store.getAll().then(setData);
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("gc-rankings:change", onChange);
    window.addEventListener("storage", onChange);

    // shared backend: listen for other people's writes in realtime
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null =
      null;
    if (isRemote && supabase) {
      channel = supabase
        .channel("gc-rankings-shared")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "gc_group_chats" },
          onChange
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "gc_people" },
          onChange
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "gc_rankings" },
          onChange
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "gc_revisions" },
          onChange
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener("gc-rankings:change", onChange);
      window.removeEventListener("storage", onChange);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { data, refresh, loading: data === null };
}
