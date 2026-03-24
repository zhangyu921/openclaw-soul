import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { storageRoot } from "@/lib/storage";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  const pack = await prisma.pack.findUnique({
    where: { slug },
    select: { zipRelPath: true },
  });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const abs = path.join(storageRoot(), pack.zipRelPath);
  try {
    const buf = await fs.readFile(abs);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug}.zip"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "file missing" }, { status: 404 });
  }
}
