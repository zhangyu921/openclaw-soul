import { NextResponse } from "next/server";
import { PackVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";
import { findUserIdByApiToken } from "@/lib/token-api";

const MAX_SUMMARY_LENGTH = 2048;

type Params = { params: Promise<{ handle: string; slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const { handle, slug } = await params;
  const pack = await prisma.pack.findFirst({
    where: { slug, author: { handle } },
    select: {
      slug: true,
      title: true,
      summary: true,
      avatarRelPath: true,
      createdAt: true,
      visibility: true,
      authorId: true,
      author: { select: { email: true, handle: true } },
    },
  });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const packJson = () => {
    const { authorId: _id, author, ...rest } = pack;
    return {
      pack: {
        ...rest,
        author: {
          handle: author.handle,
          email: maskEmail(author.email),
        },
      },
    };
  };

  if (pack.visibility === PackVisibility.LISTED) {
    return NextResponse.json(packJson());
  }

  const auth = req.headers.get("authorization");
  const m = auth?.match(/^Bearer\s+(.+)$/i);
  const plain = m?.[1]?.trim();
  if (!plain) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const userId = await findUserIdByApiToken(plain);
  if (!userId || userId !== pack.authorId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(packJson());
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
