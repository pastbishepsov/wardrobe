"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-[32px] leading-none">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function BackLink({ href, label = "Назад" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
      {label}
    </Link>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center fade-up">
      <p className="display text-2xl">{title}</p>
      {text && <p className="max-w-xs text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button aria-label="Закрыть" className="absolute inset-0 touch-none bg-ink/40" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-t-[24px] bg-elev px-4 pt-3 shadow-2xl fade-up max-h-[88dvh] overflow-y-auto overscroll-contain"
        style={{ paddingBottom: "calc(16px + var(--safe-bottom))" }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        {title && <h2 className="mb-3 text-2xl">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-line bg-elev p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${value === o.value ? "bg-ink text-elev" : "text-ink-soft"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Scale({ value, onChange, labels }: { value: number; onChange: (v: number) => void; labels: Record<number, string> }) {
  return (
    <div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-9 flex-1 rounded-xl border text-sm font-semibold transition ${n === value ? "border-accent bg-accent text-accent-ink" : "border-line bg-elev text-ink-soft"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-ink-soft">{labels[value]}</p>
    </div>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <div className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-elev shadow-lg fade-up">{text}</div>
    </div>
  );
}
