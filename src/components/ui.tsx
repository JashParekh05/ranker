"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "soft" | "danger";
}) {
  const styles = {
    primary:
      "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-pop hover:brightness-110 active:scale-[0.98]",
    soft: "bg-white/10 text-brand-200 hover:bg-white/20 border border-white/10",
    ghost: "bg-transparent text-muted hover:bg-white/10 hover:text-ink",
    danger: "bg-transparent text-red-400 hover:bg-red-500/10",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        styles,
        className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-xl2", className)} {...props} />;
}

export function TopBar({
  title,
  back,
  right,
}: {
  title: string;
  back?: { href: string; label?: string };
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-base/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
        {back && (
          <Link
            href={back.href}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand-200 transition hover:bg-white/10"
          >
            {"< "}
            {back.label ?? "Back"}
          </Link>
        )}
        <h1 className="font-display text-lg font-700 tracking-tight text-ink">
          {title}
        </h1>
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
