"use client";

import { useEffect, useState } from "react";

const KEY = "gc-rankings:joined";

export function getJoined(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function addJoined(gcId: string) {
  if (typeof window === "undefined" || !gcId) return;
  const set = new Set(getJoined());
  if (set.has(gcId)) return;
  set.add(gcId);
  window.localStorage.setItem(KEY, JSON.stringify([...set]));
  window.dispatchEvent(new Event("gc-rankings:joined-change"));
}

export function leaveGroup(gcId: string) {
  if (typeof window === "undefined") return;
  const next = getJoined().filter((id) => id !== gcId);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("gc-rankings:joined-change"));
}

/** Reactive list of joined group ids for this device. */
export function useJoined(): string[] {
  const [joined, setJoined] = useState<string[]>([]);
  useEffect(() => {
    setJoined(getJoined());
    const on = () => setJoined(getJoined());
    window.addEventListener("gc-rankings:joined-change", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("gc-rankings:joined-change", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return joined;
}
