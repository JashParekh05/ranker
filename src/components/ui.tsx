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
      "bg-brand-600 text-white hover:bg-brand-700 shadow-pop active:scale-[0.98]",
    soft: "bg-brand-100 text-brand-700 hover:bg-brand-200",
    ghost: "bg-transparent text-muted hover:bg-brand-50 hover:text-brand-700",
    danger: "bg-transparent text-red-500 hover:bg-red-50",
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
  return (
    <div
      className={cn(
        "rounded-xl2 border border-brand-100 bg-white/80 backdrop-blur shadow-soft",
        className
      )}
      {...props}
    />
  );
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
    <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
        {back && (
          <Link
            href={back.href}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
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
