import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_OPENCLAW_SOUL_API } from "../src/constants.ts";
import { resolveDefaultApiBase } from "../src/load-env.ts";

describe("resolveDefaultApiBase", () => {
  let prevApi: string | undefined;

  beforeEach(() => {
    prevApi = process.env.OPENCLAW_SOUL_API;
    delete process.env.OPENCLAW_SOUL_API;
  });

  afterEach(() => {
    if (prevApi === undefined) {
      delete process.env.OPENCLAW_SOUL_API;
    } else {
      process.env.OPENCLAW_SOUL_API = prevApi;
    }
  });

  it("uses DEFAULT_OPENCLAW_SOUL_API when OPENCLAW_SOUL_API is unset", () => {
    expect(resolveDefaultApiBase()).toBe(DEFAULT_OPENCLAW_SOUL_API);
  });

  it("uses OPENCLAW_SOUL_API when set (strips trailing slash)", () => {
    process.env.OPENCLAW_SOUL_API = "https://example.com/registry/";
    expect(resolveDefaultApiBase()).toBe("https://example.com/registry");
  });

  it("documents the public default hostname (regression guard)", () => {
    expect(DEFAULT_OPENCLAW_SOUL_API).toBe(
      "https://openclaw-soul.basilfield.com"
    );
  });
});
