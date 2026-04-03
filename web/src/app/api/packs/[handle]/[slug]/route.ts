import { NextResponse } from "next/server";
import { PackVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readSessionUserId } from "@/lib/session";
import { findUserIdByApiToken } from "@/lib/token-api";
import { normalizeShowcaseImageRefs } from "@/lib/showcase-refs";
import { MAX_SHOWCASE_MD_CHARS } from "@/lib/upload-limits";

const MAX_SUMMARY_LENGTH = 2048;
const MAX_TITLE_LENGTH = 256;

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
      showcaseMd: true,
      showcaseImageRefs: true,
      author: { select: { email: true, handle: true } },
    },
  });
  if (!pack) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const packJson = () => {
    const { authorId, author, showcaseImageRefs, ...rest } = pack;
    void authorId;
    const refs = normalizeShowcaseImageRefs(showcaseImageRefs);
    return {
      pack: {
        ...rest,
        showcaseImageCount: refs.length,
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
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const hasTitle = "title" in b;
  const hasSummary = "summary" in b;
  const hasShowcaseMd = "showcaseMd" in b;
  if (!hasTitle && !hasSummary && !hasShowcaseMd) {
    return NextResponse.json(
      { error: "provide at least one of: title, summary, showcaseMd" },
      { status: 400 }
    );
  }

  const data: {
    title?: string;
    summary?: string | null;
    showcaseMd?: string | null;
  } = {};

  if (hasTitle) {
    const rawTitle = b.title;
    if (typeof rawTitle !== "string") {
      return NextResponse.json({ error: "title must be a string" }, { status: 400 });
    }
    const trimmedTitle = rawTitle.trim();
    if (!trimmedTitle) {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    }
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        {
          error: `title too long (max ${MAX_TITLE_LENGTH} characters)`,
        },
        { status: 400 }
      );
    }
    data.title = trimmedTitle;
  }

  if (hasSummary) {
    const raw = b.summary;
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
    data.summary = summary;
  }

  if (hasShowcaseMd) {
    const raw = b.showcaseMd;
    if (raw !== null && typeof raw !== "string") {
      return NextResponse.json(
        { error: "showcaseMd must be a string or null" },
        { status: 400 }
      );
    }
    if (raw === null) {
      data.showcaseMd = null;
    } else {
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        data.showcaseMd = null;
      } else if (trimmed.length > MAX_SHOWCASE_MD_CHARS) {
        return NextResponse.json(
          {
            error: `showcaseMd too long (max ${MAX_SHOWCASE_MD_CHARS} characters)`,
          },
          { status: 400 }
        );
      } else {
        data.showcaseMd = trimmed;
      }
    }
  }

  await prisma.pack.update({
    where: { id: pack.id },
    data,
  });

  const updated = await prisma.pack.findUnique({
    where: { id: pack.id },
    select: { title: true, summary: true, showcaseMd: true },
  });
  return NextResponse.json({
    title: updated?.title,
    summary: updated?.summary ?? null,
    showcaseMd: updated?.showcaseMd ?? null,
  });
}

function maskEmail(email: string): string {
  const [a, d] = email.split("@");
  if (!d) return "***";
  const head = a.slice(0, 2);
  return `${head}***@${d}`;
}
