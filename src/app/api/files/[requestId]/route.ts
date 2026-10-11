import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { resolveUpload } from "@/lib/files";

export async function GET(_: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Yetkisiz", { status: 401 });

  const request = await prisma.printRequest.findUnique({ where: { id: requestId }, include: { order: true } });
  if (!request?.filePath) return new NextResponse("Bulunamadı", { status: 404 });

  const allowed =
    user.role === "ADMIN" ||
    request.customerId === user.id ||
    (user.role === "BUSINESS" && (request.status === "OPEN" || request.order?.businessId === user.id));
  if (!allowed) return new NextResponse("Yetkisiz", { status: 403 });

  const data = await fs.readFile(resolveUpload(request.filePath));
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(request.fileName ?? "model")}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
