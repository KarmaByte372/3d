const LABELS: Record<string, [string, string]> = {
  OPEN: ["Açık", "bg-blue-100 text-blue-800"],
  ASSIGNED: ["Atandı", "bg-purple-100 text-purple-800"],
  CANCELLED: ["İptal", "bg-gray-200 text-gray-700"],
  PENDING: ["Bekliyor", "bg-yellow-100 text-yellow-800"],
  ACCEPTED: ["Kabul edildi", "bg-green-100 text-green-800"],
  REJECTED: ["Reddedildi", "bg-red-100 text-red-800"],
  WITHDRAWN: ["Geri çekildi", "bg-gray-200 text-gray-700"],
  IN_PROGRESS: ["Hazırlanıyor", "bg-blue-100 text-blue-800"],
  SHIPPED: ["Kargoda", "bg-indigo-100 text-indigo-800"],
  COMPLETED: ["Tamamlandı", "bg-green-100 text-green-800"],
  APPROVED: ["Onaylandı", "bg-green-100 text-green-800"],
  PAID: ["Ödendi", "bg-green-100 text-green-800"],
  FAILED: ["Başarısız", "bg-red-100 text-red-800"],
  ACTIVE: ["Aktif", "bg-green-100 text-green-800"],
  SUSPENDED: ["Askıda", "bg-red-100 text-red-800"],
  CUSTOMER: ["Müşteri", "bg-sky-100 text-sky-800"],
  BUSINESS: ["İşletme", "bg-orange-100 text-orange-800"],
  ADMIN: ["Admin", "bg-gray-800 text-white"],
};

export function Badge({ status }: { status: string }) {
  const [label, cls] = LABELS[status] ?? [status, "bg-gray-100 text-gray-700"];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
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
};
