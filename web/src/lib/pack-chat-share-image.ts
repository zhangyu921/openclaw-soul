import type { UIMessage } from "ai";
import { compressShowcaseForUpload } from "@/lib/compress-showcase-client";
import { textFromMessage } from "@/lib/pack-chat-message-text";
import { filterMessagesForShowcaseShare } from "@/lib/pack-chat-share-messages";

export const SHARE_IMAGE_EMPTY = "SHARE_IMAGE_EMPTY";

export type BuildShareImageOptions = {
  /** 画布底部「已截断」提示（与 locale 一致） */
  truncatedFooter: string;
};

const EXPORT_WIDTH = 720;
const PADDING = 24;
const MAX_CANVAS_HEIGHT = 16000;
const GAP = 14;
const BUBBLE_PAD = 12;
const BUBBLE_RADIUS = 12;
const FONT_SIZE = 14;
const LINE_HEIGHT_PX = 20;
const ROLE_LABEL_H = 18;
const FOOTER_GAP = 8;
const FOOTER_TEXT_SIZE = 12;

const BG = "#fafafa";
const USER_BG = "#18181b";
const USER_FG = "#fafafa";
const ASST_BG = "#e4e4e7";
const ASST_FG = "#18181b";
const ROLE_USER = "You";
const ROLE_ASST = "Assistant";

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");
  for (const para of paragraphs) {
    if (para.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (let i = 0; i < para.length; i++) {
      const ch = para[i];
      const test = line + ch;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        if (line.length > 0) {
          lines.push(line);
          line = ch;
        } else {
          lines.push(ch);
          line = "";
        }
      }
    }
    if (line.length > 0) lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

/**
 * 返回 webp 或 jpeg File（经 compressShowcaseForUpload），供 showcase-image POST。
 * 仅在浏览器调用。
 */
export async function buildPackChatShareImageFile(
  messages: UIMessage[],
  options: BuildShareImageOptions
): Promise<File> {
  if (typeof document === "undefined") {
    throw new Error("buildPackChatShareImageFile requires a browser");
  }

  const filtered = filterMessagesForShowcaseShare(messages);
  if (filtered.length === 0) {
    throw new Error(SHARE_IMAGE_EMPTY);
  }

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) {
    throw new Error("Could not create canvas context");
  }
  measure.font = `${FONT_SIZE}px system-ui, -apple-system, sans-serif`;

  const maxBubbleOuterW = EXPORT_WIDTH - PADDING * 2;
  const maxTextW = maxBubbleOuterW - BUBBLE_PAD * 2;

  type Row =
    | {
        kind: "bubble";
        role: "user" | "assistant";
        lines: string[];
        h: number;
      }
    | { kind: "footer"; lines: string[] };

  const rows: Row[] = [];
  let truncated = false;

  let yCursor = PADDING;
  const FOOTER_RESERVE = FOOTER_GAP + FOOTER_TEXT_SIZE * 3 + PADDING;

  for (const m of filtered) {
    const text = textFromMessage(m).trim() || " ";
    const lines = wrapLines(measure, text, maxTextW);
    const contentH = Math.max(1, lines.length) * LINE_HEIGHT_PX;
    const bubbleH = ROLE_LABEL_H + contentH + BUBBLE_PAD * 2;
    const step = bubbleH + GAP;

    if (yCursor + step > MAX_CANVAS_HEIGHT - FOOTER_RESERVE) {
      truncated = true;
      break;
    }

    rows.push({
      kind: "bubble",
      role: m.role === "user" ? "user" : "assistant",
      lines,
      h: bubbleH,
    });
    yCursor += step;
  }

  if (truncated) {
    measure.font = `${FOOTER_TEXT_SIZE}px system-ui, -apple-system, sans-serif`;
    rows.push({
      kind: "footer",
      lines: wrapLines(measure, options.truncatedFooter, EXPORT_WIDTH - PADDING * 2),
    });
  }

  measure.font = `${FOOTER_TEXT_SIZE}px system-ui, -apple-system, sans-serif`;
  let totalH = PADDING;
  for (const r of rows) {
    if (r.kind === "bubble") {
      totalH += r.h + GAP;
    } else {
      totalH +=
        FOOTER_GAP + r.lines.length * (FOOTER_TEXT_SIZE + 4) + PADDING;
    }
  }
  totalH = Math.min(Math.max(totalH, PADDING * 2 + 40), MAX_CANVAS_HEIGHT);

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, EXPORT_WIDTH, totalH);

  let y = PADDING;
  for (const row of rows) {
    if (row.kind === "footer") {
      y += FOOTER_GAP;
      ctx.font = `${FOOTER_TEXT_SIZE}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "#71717a";
      for (const ln of row.lines) {
        ctx.fillText(ln, PADDING, y + FOOTER_TEXT_SIZE);
        y += FOOTER_TEXT_SIZE + 4;
      }
      break;
    }

    const isUser = row.role === "user";
    const bg = isUser ? USER_BG : ASST_BG;
    const fg = isUser ? USER_FG : ASST_FG;
    const label = isUser ? ROLE_USER : ROLE_ASST;

    ctx.font = `600 ${FONT_SIZE - 1}px system-ui, -apple-system, sans-serif`;
    const labelW = ctx.measureText(label).width;
    const bubbleW = Math.min(
      maxBubbleOuterW,
      Math.max(
        labelW,
        ...row.lines.map((ln) => ctx.measureText(ln || " ").width)
      ) +
        BUBBLE_PAD * 2
    );

    const x = isUser ? EXPORT_WIDTH - PADDING - bubbleW : PADDING;

    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x, y, bubbleW, row.h, BUBBLE_RADIUS);
    ctx.fill();

    ctx.fillStyle = fg;
    ctx.textBaseline = "top";
    ctx.font = `600 ${FONT_SIZE - 1}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(label, x + BUBBLE_PAD, y + BUBBLE_PAD);

    ctx.font = `${FONT_SIZE}px system-ui, -apple-system, sans-serif`;
    let ly = y + BUBBLE_PAD + ROLE_LABEL_H;
    for (const ln of row.lines) {
      ctx.fillText(ln || " ", x + BUBBLE_PAD, ly);
      ly += LINE_HEIGHT_PX;
    }

    y += row.h + GAP;
  }

  let blob =
    (await canvasToBlob(canvas, "image/webp", 0.92)) ??
    (await canvasToBlob(canvas, "image/jpeg", 0.92));
  if (!blob) {
    throw new Error("Could not encode image");
  }

  const ext = blob.type.includes("webp") ? "webp" : "jpg";
  const mime = blob.type || (ext === "webp" ? "image/webp" : "image/jpeg");
  let file = new File([blob], `chat-share.${ext}`, { type: mime });

  return compressShowcaseForUpload(file);
}
