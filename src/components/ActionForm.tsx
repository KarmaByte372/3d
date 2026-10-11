"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/errors";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
};

/** Sunucu eylemini çalıştırıp hata/başarı mesajını gösteren form. */
export function ActionForm({ action, children, className, confirm }: Props) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
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
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Bekleyin…" : children}
    </button>
  );
}
