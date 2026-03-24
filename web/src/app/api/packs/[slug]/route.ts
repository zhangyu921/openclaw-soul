import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  const pack = await prisma.pack.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      summary: true,
      avatarRelPath: true,
      createdAt: true,
      author: { select: { email: true } },
    },
  });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({
    pack: {
      ...pack,
      author: { email: maskEmail(pack.author.email) },
    },
  });
}

function maskEmail(email: string): string {
  const [a, d] = email.split("@");
  if (!d) return "***";
  const head = a.slice(0, 2);
  return `${head}***@${d}`;
}
