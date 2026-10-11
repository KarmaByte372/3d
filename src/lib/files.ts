import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { AppError } from "./errors";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = [".stl", ".obj", ".3mf", ".step", ".stp", ".zip"];

/** Model dosyasını public klasörün dışına rastgele adla kaydeder; erişim yalnızca yetki kontrollü rota üzerindendir. */
export async function saveModelFile(file: File) {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new AppError(`Desteklenen dosya türleri: ${ALLOWED_EXTENSIONS.join(", ")}`);
  }
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError("Dosya en fazla 50 MB olabilir.");
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const stored = `${crypto.randomUUID()}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, stored), Buffer.from(await file.arrayBuffer()));
  const safeName = path.basename(file.name).replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120);
  return { fileName: safeName, filePath: stored };
}

export function resolveUpload(stored: string) {
  // Yalnızca kendi ürettiğimiz adlar: uuid + uzantı
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,4}$/.test(stored)) throw new Error("Geçersiz dosya yolu");
  return path.join(UPLOAD_DIR, stored);
}
