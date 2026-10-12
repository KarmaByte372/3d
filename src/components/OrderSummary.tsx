import Link from "next/link";
import { Badge } from "./Badge";
import { IconAlert, IconTruck } from "./Icons";
import { OrderProgress } from "./OrderProgress";
import { formatDateTime } from "@/lib/dates";
import { formatBps, formatTL } from "@/lib/money";

type O = {
  id: string;
  status: string;
  amount: number;
  commissionBps: number;
  commissionAmount: number;
  businessEarning: number;
  trackingInfo: string | null;
  cancelReason: string | null;
  disputed: boolean;
  disputeReason: string | null;
  createdAt: Date;
  shippedAt: Date | null;
  completedAt: Date | null;
  request: { id: string; title: string; fileName: string | null };
};

/** Sipariş özet kartı; görünüm role göre değişir. */
export function OrderSummary({ order, view, counterpart }: { order: O; view: "customer" | "business" | "admin"; counterpart: React.ReactNode }) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-500">{counterpart}</p>
          <p className="mt-1 font-mono text-[11px] text-ink-400">Sipariş #{order.id.slice(-8).toUpperCase()} · {formatDateTime(order.createdAt)}</p>
          {order.request.fileName && (
            <a href={`/api/files/${order.request.id}`} className="link mt-2 inline-block text-sm">Model: {order.request.fileName}</a>
          )}
        </div>
        <div className="text-right text-sm">
          {view === "customer" ? (
            <p className="font-display text-2xl font-bold">{formatTL(order.amount)}</p>
          ) : (
            <>
              <p>Sipariş: <strong>{formatTL(order.amount)}</strong></p>
              <p className="text-ink-500">Komisyon ({formatBps(order.commissionBps)}): −{formatTL(order.commissionAmount)}</p>
              <p className="text-emerald-700">{view === "admin" ? "İşletmeye" : "Net kazanç"}: <strong>{formatTL(order.businessEarning)}</strong></p>
            </>
          )}
          <div className="mt-1"><Badge status={order.status} /></div>
        </div>
      </div>
      <OrderProgress status={order.status} />
      {order.trackingInfo && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-1.5 font-mono text-xs">
          <IconTruck className="h-4 w-4 text-brand-600" /> {order.trackingInfo}
        </p>
      )}
      {order.cancelReason && <p className="mt-3 text-sm text-ink-600">İptal nedeni: {order.cancelReason}</p>}
      {order.disputed && order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
        <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <IconAlert className="mt-0.5 h-5 w-5 flex-none" />
          <div>
            <p className="font-semibold">Sorun bildirildi, yönetici inceliyor</p>
            <p className="mt-0.5 whitespace-pre-wrap">{order.disputeReason}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="hover:text-brand-600">{children}</Link>;
}
