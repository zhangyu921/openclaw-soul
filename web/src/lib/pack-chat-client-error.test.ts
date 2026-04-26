import { describe, expect, it } from "vitest";

import {
  formatPackChatErrorForDisplay,
  getPackChatErrorStatusCode,
  type PackChatStreamErrorCopy,
} from "./pack-chat-client-error";

const copy: PackChatStreamErrorCopy = {
  generic: "GEN",
  unauthorized: "401_COPY",
  notFound: "404_COPY",
  rateLimit: "429_COPY",
  serviceUnavailable: "503_COPY",
  badRequest: "400_COPY",
  network: "NET_COPY",
};

describe("getPackChatErrorStatusCode", () => {
  it("reads statusCode on error-like object", () => {
    expect(getPackChatErrorStatusCode({ statusCode: 404 })).toBe(404);
  });

  it("reads status as fallback", () => {
    expect(getPackChatErrorStatusCode({ status: 503 })).toBe(503);
  });

  it("reads nested cause.statusCode", () => {
    expect(
      getPackChatErrorStatusCode({ cause: { statusCode: 429 } })
    ).toBe(429);
  });

  it("returns undefined for primitives", () => {
    expect(getPackChatErrorStatusCode(null)).toBeUndefined();
    expect(getPackChatErrorStatusCode("x")).toBeUndefined();
  });
});

describe("formatPackChatErrorForDisplay", () => {
  it("never includes stack traces", () => {
    const err = new Error("Not Found");
    err.stack = "Error: Not Found\n    at secret.js:1:1";
    const out = formatPackChatErrorForDisplay(err, copy);
    expect(out).toBe("404_COPY");
    expect(out).not.toContain("secret.js");
    expect(out).not.toContain("at ");
  });

  it("uses statusCode when present", () => {
    expect(
      formatPackChatErrorForDisplay({ message: "x", statusCode: 401 }, copy)
    ).toBe("401_COPY");
  });

  it("maps AI_APICallError-style Not Found by message", () => {
    const err = new Error("Not Found");
    err.name = "AI_APICallError";
    expect(formatPackChatErrorForDisplay(err, copy)).toBe("404_COPY");
  });

  it("maps unauthorized by message", () => {
    expect(
      formatPackChatErrorForDisplay(new Error("HTTP 401"), copy)
    ).toBe("401_COPY");
  });

  it("maps rate limit", () => {
    expect(
      formatPackChatErrorForDisplay(new Error("429 rate limit"), copy)
    ).toBe("429_COPY");
  });

  it("maps chat unavailable / 503 body text", () => {
    expect(
      formatPackChatErrorForDisplay(
        new Error("chat unavailable: set PACK_CHAT_PROVIDER"),
        copy
      )
    ).toBe("503_COPY");
  });

  it("maps network-ish messages", () => {
    expect(
      formatPackChatErrorForDisplay(new Error("Failed to fetch"), copy)
    ).toBe("NET_COPY");
  });

  it("maps generic validation errors", () => {
    expect(
      formatPackChatErrorForDisplay(
        new Error("could not convert messages to model format"),
        copy
      )
    ).toBe("400_COPY");
  });

  it("falls back to generic", () => {
    expect(
      formatPackChatErrorForDisplay(new Error("Something weird"), copy)
    ).toBe("GEN");
  });

  it("handles non-Error throwables", () => {
    expect(formatPackChatErrorForDisplay("string fail", copy)).toBe("GEN");
  });
});
