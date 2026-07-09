"use client";

import { useEffect, useState } from "react";

const ME_KEY = "gc-rankings:me";

export function getMe(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ME_KEY) ?? "";
}

export function setMe(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ME_KEY, name.trim());
  window.dispatchEvent(new Event("gc-rankings:me-change"));
}

/** Case-insensitive name match used for author / proposer identity. */
export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Reactive hook for the current user's name. */
export function useMe(): [string, (n: string) => void] {
  const [me, setLocal] = useState<string>("");
  useEffect(() => {
    setLocal(getMe());
    const on = () => setLocal(getMe());
    window.addEventListener("gc-rankings:me-change", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("gc-rankings:me-change", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return [me, setMe];
}
