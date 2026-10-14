import { logoutAction } from "@/app/actions";
import { formatTL } from "@/lib/money";
import Link from "next/link";
import { IconBell, IconLogout, IconWallet } from "./Icons";
import { Logo } from "./Logo";
import { MobileNav, NavLinks, type NavItem } from "./NavLinks";
import * as Icons from "./Icons";

export function Shell({
  title,
  nav,
  user,
  showBalance,
  balanceLabel = "Bakiye",
  wallets,
  base,
  unread = 0,
  children,
}: {
  base: string;
  unread?: number;
  title: string;
  nav: NavItem[];
  user: { name: string; balance: number };
  showBalance?: boolean;
  balanceLabel?: string;
  /** Başlıkta gösterilecek cüzdanlar (verilirse showBalance yerine kullanılır) */
  wallets?: { label: string; amount: number; href: string }[];
  children: React.ReactNode;
}) {
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase("tr-TR");

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 bg-ink-900 bg-plate">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Logo dark />
              <span className="hidden truncate rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-ink-300 sm:inline">
                {title}
              </span>
            </div>
            <div className="flex flex-none items-center gap-2 sm:gap-3">
              {wallets?.map((w) => (
                <Link key={w.href} href={w.href} title={w.label}
                  className="flex flex-col items-start rounded-xl border border-white/10 bg-white/5 px-2 py-0.5 leading-tight transition hover:bg-white/10 sm:flex-row sm:items-center sm:gap-2 sm:px-3 sm:py-1.5">
                  <span className="text-[9px] uppercase tracking-wide text-ink-400 sm:text-xs sm:normal-case sm:tracking-normal sm:text-ink-300">{w.label}</span>
                  <span className="font-mono text-xs font-semibold text-white sm:text-sm">{formatTL(w.amount)}</span>
                </Link>
              ))}
              {showBalance && !wallets && (
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
                  <IconWallet className="h-4 w-4 text-filament-orange" />
                  <span className="hidden text-xs text-ink-300 sm:inline">{balanceLabel}</span>
                  <span className="font-mono text-sm font-semibold text-white">{formatTL(user.balance)}</span>
                </div>
              )}
              <Link
                href={`${base}/bildirimler`}
                className="relative grid h-8 w-8 place-items-center rounded-lg text-ink-300 transition hover:bg-white/10 hover:text-white"
                title="Bildirimler"
                aria-label={unread ? `${unread} okunmamış bildirim` : "Bildirimler"}
              >
                <IconBell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-filament-pink px-1 font-mono text-[10px] font-bold leading-[18px] text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              <Link href={`${base}/hesap`} className="hidden items-center gap-2 rounded-lg p-0.5 transition hover:bg-white/10 md:flex" title="Hesabım">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-filament-orange to-filament-pink text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="hidden pr-2 text-sm text-ink-200 md:inline">{user.name}</span>
              </Link>
              <form action={logoutAction} className="hidden md:block">
                <button
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-300 transition hover:bg-white/10 hover:text-white"
                  title="Çıkış yap"
                  aria-label="Çıkış yap"
                >
                  <IconLogout className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
          <NavLinks items={nav} />
        </div>
        <div className="filament-line" />
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:py-8 md:pb-8">{children}</main>
      <MobileNav items={nav} base={base} unread={unread} logout={logoutAction} />
    </div>
  );
}

export function PageTitle({
  children,
  action,
  eyebrow,
  description,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  eyebrow?: string;
  description?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="break-words text-2xl font-bold sm:text-3xl">{children}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const ACCENTS = {
  orange: "from-filament-orange/15 text-filament-orange",
  pink: "from-filament-pink/15 text-filament-pink",
  cyan: "from-filament-cyan/20 text-cyan-600",
  lime: "from-filament-lime/25 text-lime-700",
} as const;

export function Stat({
  label,
  value,
  hint,
  icon,
  accent = "orange",
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: keyof typeof Icons;
  accent?: keyof typeof ACCENTS;
  href?: string;
}) {
  const Icon = icon ? Icons[icon] : null;
  const Box = href ? Link : "div";
  return (
    <Box href={href!} className={`card relative overflow-hidden ${href ? "card-hover" : ""}`}>
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br to-transparent ${ACCENTS[accent]}`} />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</p>
        {Icon && <Icon className={`h-5 w-5 ${ACCENTS[accent].split(" ")[1]}`} />}
      </div>
      <p className="relative mt-2 font-display text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="relative mt-1 text-xs text-ink-400">{hint}</p>}
    </Box>
  );
}

export function Empty({ children, icon = "IconCube" }: { children: React.ReactNode; icon?: keyof typeof Icons }) {
  const Icon = Icons[icon];
  return (
    <div className="bg-plate-light flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-200 px-6 py-10 text-center text-sm text-ink-500">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-ink-400 shadow-card">
        <Icon className="h-6 w-6" />
      </span>
      <div>{children}</div>
    </div>
  );
}
