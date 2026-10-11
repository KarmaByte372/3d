import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { formatTL } from "@/lib/money";

type NavItem = { href: string; label: string };

export function Shell({
  title,
  nav,
  user,
  showBalance,
  balanceLabel = "Bakiye",
  children,
}: {
  title: string;
  nav: NavItem[];
  user: { name: string; balance: number };
  showBalance?: boolean;
  balanceLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold text-brand-600">
              Baskı3D
            </Link>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{title}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {showBalance && (
              <span className="rounded-lg bg-brand-50 px-3 py-1 font-semibold text-brand-700">
                {balanceLabel}: {formatTL(user.balance)}
              </span>
            )}
            <span className="hidden text-gray-600 sm:inline">{user.name}</span>
            <form action={logoutAction}>
              <button className="text-gray-500 hover:text-gray-900">Çıkış</button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-gray-600 hover:border-brand-500 hover:text-gray-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

export function PageTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{children}</h1>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">{children}</p>;
}
