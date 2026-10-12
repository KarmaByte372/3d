const TONES = {
  blue: "bg-sky-50 text-sky-700 ring-sky-200 [--dot:theme(colors.sky.500)]",
  violet: "bg-violet-50 text-violet-700 ring-violet-200 [--dot:theme(colors.violet.500)]",
  gray: "bg-ink-50 text-ink-500 ring-ink-200 [--dot:theme(colors.ink.400)]",
  amber: "bg-amber-50 text-amber-700 ring-amber-200 [--dot:theme(colors.amber.500)]",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200 [--dot:theme(colors.emerald.500)]",
  red: "bg-red-50 text-red-700 ring-red-200 [--dot:theme(colors.red.500)]",
  orange: "bg-brand-50 text-brand-700 ring-brand-200 [--dot:theme(colors.brand.500)]",
  dark: "bg-ink-900 text-white ring-ink-900 [--dot:theme(colors.filament.orange)]",
} as const;

const LABELS: Record<string, [string, keyof typeof TONES, boolean?]> = {
  OPEN: ["Teklif alıyor", "blue", true],
  ASSIGNED: ["Atandı", "violet"],
  CANCELLED: ["İptal", "gray"],
  PENDING: ["Bekliyor", "amber", true],
  ACCEPTED: ["Kabul edildi", "green"],
  REJECTED: ["Reddedildi", "red"],
  WITHDRAWN: ["Geri çekildi", "gray"],
  IN_PROGRESS: ["Basılıyor", "orange", true],
  SHIPPED: ["Kargoda", "violet", true],
  COMPLETED: ["Tamamlandı", "green"],
  APPROVED: ["Onaylandı", "green"],
  PAID: ["Ödendi", "green"],
  FAILED: ["Başarısız", "red"],
  ACTIVE: ["Aktif", "green"],
  SUSPENDED: ["Askıda", "red"],
  CUSTOMER: ["Müşteri", "blue"],
  BUSINESS: ["İşletme", "orange"],
  ADMIN: ["Admin", "dark"],
  ID_NONE: ["Kimlik girilmedi", "gray"],
  ID_PENDING: ["Kimlik onay bekliyor", "amber", true],
  ID_VERIFIED: ["Kimlik doğrulandı", "green"],
  ID_REJECTED: ["Kimlik reddedildi", "red"],
};

export function Badge({ status }: { status: string }) {
  const [label, tone, live] = LABELS[status] ?? [status, "gray"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--dot)] opacity-60" />}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--dot)]" />
      </span>
      {label}
    </span>
  );
}

export const LEDGER_LABELS: Record<string, string> = {
  TOPUP: "Bakiye yükleme",
  ORDER_HOLD: "Sipariş ödemesi",
  ORDER_REFUND: "İade",
  EARNING: "Kazanç",
  COMMISSION: "Komisyon",
  PAYOUT: "Haftalık ödeme",
  PAYOUT_REVERSAL: "Ödeme iadesi",
  ADJUSTMENT: "Düzeltme",
  WITHDRAWAL: "Para çekme",
  WITHDRAWAL_REVERSAL: "Çekim iadesi",
};
