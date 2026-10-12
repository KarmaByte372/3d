"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as Icons from "./Icons";

export type NavItem = { href: string; label: string; icon: keyof typeof Icons; short?: string };

function useActive(items: NavItem[]) {
  const pathname = usePathname();
  // En uzun eşleşen yol aktif sayılır (ör. /musteri/bakiye, /musteri'yi bastırır)
  return items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** Masaüstü: başlık altındaki sekmeler. Mobilde gizlenir, yerini alt menü alır. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const active = useActive(items);
  return (
    <nav className="-mb-px hidden gap-1 overflow-x-auto [scrollbar-width:none] md:flex">
      {items.map((item) => {
        const Icon = Icons[item.icon];
        const isActive = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`group relative flex items-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors ${
              isActive ? "text-white" : "text-ink-300 hover:text-white"
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? "text-filament-orange" : "text-ink-400 group-hover:text-ink-200"}`} />
            {item.label}
            <span
              className={`absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-gradient-to-r from-filament-orange via-filament-pink to-filament-cyan transition-opacity ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Mobil alt menü: ilk dört sayfa + "Menü". Menü, tüm sayfaları, hesap, bildirimler ve çıkışı
 * içeren alttan açılan bir panel gösterir.
 */
export function MobileNav({
  items,
  base,
  unread,
  logout,
}: {
  items: NavItem[];
  base: string;
  unread: number;
  logout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const all: NavItem[] = [
    ...items,
    { href: `${base}/bildirimler`, label: "Bildirimler", icon: "IconBell" },
    { href: `${base}/hesap`, label: "Hesabım", icon: "IconUser" },
  ];
  const active = useActive(all);
  const primary = items.slice(0, 4);
  const moreActive = !!active && !primary.some((i) => i.href === active);

  // Sayfa değişince paneli kapat
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      {open && (
        <div className="fixed inset-0 z-40 bg-ink-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white pb-[calc(env(safe-area-inset-bottom)+5rem)] shadow-2xl transition-[transform,visibility] duration-300 ${
          open ? "visible translate-y-0" : "pointer-events-none invisible translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menü"
        aria-hidden={!open}
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-ink-200" />
        <div className="grid grid-cols-3 gap-2 p-4">
          {all.map((item) => {
            const Icon = Icons[item.icon];
            const isActive = item.href === active;
            return (
              <Link
                key={item.href}
                href={item.href}
                tabIndex={open ? 0 : -1}
                className={`relative flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center text-xs font-medium transition ${
                  isActive ? "bg-ink-900 text-white" : "bg-ink-50 text-ink-700 active:bg-ink-100"
                }`}
              >
                <Icon className={`h-6 w-6 ${isActive ? "text-filament-orange" : "text-ink-500"}`} />
                {item.label}
                {item.icon === "IconBell" && unread > 0 && (
                  <span className="absolute right-3 top-2 grid min-w-[18px] place-items-center rounded-full bg-filament-pink px-1 font-mono text-[10px] font-bold leading-[18px] text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <form action={logout} className="px-4">
          <button tabIndex={open ? 0 : -1} className="btn-secondary w-full py-3">
            <Icons.IconLogout className="h-4 w-4" /> Çıkış yap
          </button>
        </form>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="filament-line absolute inset-x-0 top-0 opacity-70" />
        <div className="grid grid-cols-5">
          {primary.map((item) => {
            const Icon = Icons[item.icon];
            const isActive = item.href === active && !open;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[10px] font-medium ${isActive ? "text-white" : "text-ink-400"}`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-filament-orange" : ""}`} />
                <span className="w-full truncate text-center">{item.short ?? item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`relative flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[10px] font-medium ${open || moreActive ? "text-white" : "text-ink-400"}`}
          >
            <svg viewBox="0 0 24 24" className={`h-5 w-5 ${open || moreActive ? "text-filament-orange" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
            {open ? "Kapat" : "Menü"}
            {unread > 0 && !open && <span className="absolute right-[30%] top-2 h-2 w-2 rounded-full bg-filament-pink" />}
          </button>
        </div>
      </nav>
    </div>
  );
}
