import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";

const MAX_SUMMARY_LENGTH = 2048;

type Params = { params: Promise<{ handle: string; slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { handle, slug } = await params;
  const pack = await prisma.pack.findFirst({
    where: { slug, author: { handle }, revokedAt: null },
    select: {
      slug: true,
      title: true,
      summary: true,
      avatarRelPath: true,
      createdAt: true,
      author: { select: { email: true, handle: true } },
    },
  });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({
    pack: {
      ...pack,
      author: {
        handle: pack.author.handle,
        email: maskEmail(pack.author.email),
      },
    },
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const userId = await readSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { handle, slug } = await params;
  const pack = await prisma.pack.findFirst({
    where: { slug, author: { handle } },
    select: { id: true, authorId: true },
  });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (pack.authorId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("summary" in body)) {
    return NextResponse.json({ error: "summary field required" }, { status: 400 });
  }
  const raw = (body as { summary: unknown }).summary;
  if (raw !== null && typeof raw !== "string") {
    return NextResponse.json({ error: "summary must be a string or null" }, { status: 400 });
  }
  const trimmed =
    raw === null ? null : typeof raw === "string" ? raw.trim() : null;
  const summary = trimmed && trimmed.length > 0 ? trimmed : null;
  if (summary && summary.length > MAX_SUMMARY_LENGTH) {
    return NextResponse.json(
      {
        error: `summary too long (max ${MAX_SUMMARY_LENGTH} characters)`,
      },
      { status: 400 }
    );
  }

  await prisma.pack.update({
    where: { id: pack.id },
    data: { summary },
  });

  return NextResponse.json({ summary });
}

function maskEmail(email: string): string {
  const [a, d] = email.split("@");
  if (!d) return "***";
  const head = a.slice(0, 2);
  return `${head}***@${d}`;
}
