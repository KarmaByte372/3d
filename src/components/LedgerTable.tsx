import { LEDGER_LABELS } from "./Badge";
import { Empty } from "./Shell";
import { formatDateTime } from "@/lib/dates";
import { formatTL } from "@/lib/money";

type Entry = { id: string; type: string; amount: number; balanceAfter: number | null; description: string; createdAt: Date };

export function LedgerTable({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return <Empty>Henüz hareket yok.</Empty>;
  return (
    <div className="card overflow-x-auto p-0">
      <table className="table">
        <thead><tr><th>Tarih</th><th>İşlem</th><th>Açıklama</th><th className="text-right">Tutar</th><th className="text-right">Bakiye</th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="whitespace-nowrap">{formatDateTime(e.createdAt)}</td>
              <td>{LEDGER_LABELS[e.type] ?? e.type}</td>
              <td>{e.description}</td>
              <td className={`whitespace-nowrap text-right font-medium ${e.amount < 0 ? "text-red-600" : "text-green-700"}`}>
                {e.amount > 0 ? "+" : ""}{formatTL(e.amount)}
              </td>
              <td className="whitespace-nowrap text-right">{e.balanceAfter === null ? "—" : formatTL(e.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
