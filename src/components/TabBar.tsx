"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/wardrobe", label: "Вещи", icon: HangerIcon },
  { href: "/builder", label: "Образы", icon: LayersIcon },
  { href: "/tryon", label: "Примерка", icon: PersonIcon },
  { href: "/trips", label: "Поездки", icon: SuitcaseIcon },
  { href: "/insights", label: "Советы", icon: SparkIcon },
];

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-elev/95 backdrop-blur"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/") || (t.href === "/builder" && pathname.startsWith("/outfits"));
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? "text-accent" : "text-ink-soft"}`}
              >
                <Icon active={active} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HangerIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7a2 2 0 1 0-2-2" />
      <path d="M12 7v2" />
      <path d="M12 9 3 15.5a1 1 0 0 0 .6 1.8h16.8a1 1 0 0 0 .6-1.8L12 9z" />
    </svg>
  );
}

function LayersIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 9 5-9 5-9-5 9-5z" />
      <path d="m3 13 9 5 9-5" />
      <path d="m3 17.5 9 5 9-5" />
    </svg>
  );
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2.5" />
      <path d="M8 10h8l1.5 5h-2.5l-.5 7h-5l-.5-7H6.5L8 10z" />
    </svg>
  );
}

function SuitcaseIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M8 7v13M16 7v13" />
    </svg>
  );
}

function SparkIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z" />
      <path d="M19 15c.3 1.7 1.3 2.7 3 3-1.7.3-2.7 1.3-3 3-.3-1.7-1.3-2.7-3-3 1.7-.3 2.7-1.3 3-3z" />
    </svg>
  );
}
