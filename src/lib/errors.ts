/** Kullanıcıya gösterilebilir iş kuralı hatası. */
export class AppError extends Error {}

export type ActionState = { error?: string; ok?: string };

export function toActionError(e: unknown): ActionState {
  if (e instanceof AppError) return { error: e.message };
  console.error(e);
  return { error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." };
}
