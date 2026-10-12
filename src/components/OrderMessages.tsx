import { sendMessageAction } from "@/app/siparis-actions";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { ActionForm, SubmitButton } from "./ActionForm";
import { IconMessage } from "./Icons";

/** Sipariş yazışması. viewerId = sayfayı görüntüleyen kullanıcı (admin için null: salt okunur). */
export async function OrderMessages({ orderId, viewerId, canWrite }: { orderId: string; viewerId: string | null; canWrite: boolean }) {
  const messages = await prisma.message.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { name: true, role: true, business: { select: { companyName: true } } } } },
  });
  return (
    <div className="card p-0">
      <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-3">
        <IconMessage className="h-5 w-5 text-brand-600" />
        <h2 className="font-semibold">Mesajlar</h2>
        <span className="ml-auto font-mono text-xs text-ink-400">{messages.length}</span>
      </div>
      <div className="bg-plate-light max-h-[28rem] space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && <p className="py-6 text-center text-sm text-ink-400">Henüz mesaj yok. Ölçü, renk ya da teslimat hakkında buradan yazışabilirsiniz.</p>}
        {messages.map((m) => {
          const mine = m.senderId === viewerId;
          const who = m.sender.business?.companyName ?? m.sender.name;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${mine ? "rounded-br-sm bg-ink-900 text-white" : "rounded-bl-sm border border-ink-100 bg-white text-ink-800"}`}>
                {!mine && <p className="mb-0.5 text-xs font-semibold text-brand-600">{who}</p>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-right font-mono text-[10px] ${mine ? "text-ink-400" : "text-ink-400"}`}>{formatDateTime(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
      {canWrite && (
        <ActionForm action={sendMessageAction} className="flex gap-2 border-t border-ink-100 p-3" resetOnSuccess>
          <input type="hidden" name="orderId" value={orderId} />
          <input className="input" name="body" placeholder="Mesaj yaz…" maxLength={2000} required autoComplete="off" />
          <SubmitButton>Gönder</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
