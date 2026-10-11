"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "./Icons";

export type NavItem = { href: string; label: string; icon: keyof typeof Icons };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  // En uzun eşleşen yol aktif sayılır (ör. /musteri/bakiye, /musteri'yi bastırır)
  const active = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
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
