import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

/** Bekleyen ödemeleri bankanın toplu EFT yüklemesi için CSV olarak verir. */
export async function GET(_: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return new NextResponse("Yetkisiz", { status: 403 });
  const { batchId } = await params;
  const batch = await prisma.payoutBatch.findUnique({
    where: { id: batchId },
    include: { payouts: { where: { status: "PENDING" }, include: { business: { include: { business: true } } } } },
  });
  if (!batch) return new NextResponse("Bulunamadı", { status: 404 });
  const { siteName } = await getSettings();

  // Hücreler formül olarak yorumlanmasın diye =,+,-,@ ile başlayanlara ' eklenir
  const cell = (v: string) => {
    const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = [
    ["IBAN", "Alıcı", "Tutar", "Açıklama", "Ödeme ID"],
    ...batch.payouts.map((p) => [
      p.iban,
      p.ibanHolder,
      (p.amount / 100).toFixed(2).replace(".", ","),
      `${siteName} hakedis ${batch.payoutDate}`,
      p.id,
    ]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="odemeler-${batch.payoutDate}.csv"`,
    },
  });
}
