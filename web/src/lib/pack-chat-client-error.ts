/**
 * Maps chat transport / model errors to short, user-facing copy (no stack traces).
 * Copy strings come from next-intl in the component; tests pass a literal object.
 */
export type PackChatStreamErrorCopy = {
  generic: string;
  unauthorized: string;
  notFound: string;
  rateLimit: string;
  serviceUnavailable: string;
  badRequest: string;
  network: string;
};

function asError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(typeof err === "string" ? err : "Unknown error");
}

function readNumericField(obj: object, key: string): number | undefined {
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Best-effort HTTP status from AI SDK or fetch-style errors. */
export function getPackChatErrorStatusCode(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const o = err as Record<string, unknown>;
  const direct =
    readNumericField(o, "statusCode") ??
    readNumericField(o, "status") ??
    readNumericField(o, "responseStatus");
  if (direct !== undefined) return direct;
  const cause = o.cause;
  if (cause && typeof cause === "object") {
    return (
      readNumericField(cause as object, "statusCode") ??
      readNumericField(cause as object, "status")
    );
  }
  return undefined;
}

export function formatPackChatErrorForDisplay(
  err: unknown,
  copy: PackChatStreamErrorCopy
): string {
  const e = asError(err);
  const status = getPackChatErrorStatusCode(err);
  const text = `${e.name} ${e.message}`.trim();

  if (status === 401) return copy.unauthorized;
  if (status === 404) return copy.notFound;
  if (status === 429) return copy.rateLimit;
  if (status === 503) return copy.serviceUnavailable;
  if (status === 400) return copy.badRequest;

  const m = text.toLowerCase();
  if (/\b401\b|unauthorized\b/.test(m)) return copy.unauthorized;
  if (/\b404\b|\bnot found\b/.test(m)) return copy.notFound;
  if (/\b429\b|rate limit|too many requests/.test(m)) return copy.rateLimit;
  if (/\b503\b|service unavailable|chat unavailable/.test(m)) {
    return copy.serviceUnavailable;
  }
  if (
    /\b400\b|bad request|userblock|invalid json|could not convert messages/.test(
      m
    )
  ) {
    return copy.badRequest;
  }
  if (
    /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(
      m
    )
  ) {
    return copy.network;
  }

  return copy.generic;
}
