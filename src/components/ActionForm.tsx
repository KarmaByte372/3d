"use client";

import { createContext, startTransition, useActionState, useContext, useRef } from "react";
import type { ActionState } from "@/lib/errors";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  /** Başarılı gönderimden sonra formu temizle (ör. mesaj kutusu) */
  resetOnSuccess?: boolean;
};

const PendingContext = createContext(false);

/**
 * Sunucu eylemini çalıştırıp hata/başarı mesajını gösteren form.
 * React 19 `action` prop'u ile gönderilen formları her durumda sıfırlar; hata alındığında kullanıcının
 * yazdıkları kaybolmasın diye gönderim onSubmit üzerinden yapılır ve form yalnızca istenirse temizlenir.
 */
export function ActionForm({ action, children, className, confirm, resetOnSuccess }: Props) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    if (resetOnSuccess && !result.error) ref.current?.reset();
    return result;
  }, {});

  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="mt-2 text-sm text-green-700">{state.ok}</p>}
    </form>
  );
}

export function SubmitButton({
  children,
  className = "btn",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pending = useContext(PendingContext);
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Bekleyin…" : children}
    </button>
  );
}
