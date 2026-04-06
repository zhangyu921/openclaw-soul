import { describe, expect, it } from "vitest";

import { buildUserBlockMarkdown } from "./user-md-template";
import { parsePackUserMd } from "./user-md-parse";

describe("parsePackUserMd", () => {
  it("returns {} for empty", () => {
    expect(parsePackUserMd("")).toEqual({});
    expect(parsePackUserMd("   ")).toEqual({});
  });

  it("parses standard fields", () => {
    const raw = `
# USER.md
- **Name:** Ada
- **What to call them:** A
- **Pronouns:** she/her
- **Timezone:** Asia/Shanghai
- **Notes:** hi

## Context

likes tea
`;
    expect(parsePackUserMd(raw)).toMatchObject({
      name: "Ada",
      whatToCall: "A",
      pronouns: "she/her",
      timezone: "Asia/Shanghai",
      notes: "hi",
    });
    expect(parsePackUserMd(raw).context).toMatch(/likes tea/);
  });

  it("returns {} for gibberish", () => {
    expect(parsePackUserMd("@@@###")).toEqual({});
  });

  it("does not put footer after --- into context", () => {
    const raw = `${buildUserBlockMarkdown({
      name: "Ada",
      whatToCall: "A",
      pronouns: "she/her",
      timezone: "UTC",
      notes: "n",
      context: "only this",
    })}`;
    expect(parsePackUserMd(raw).context).toBe("only this");
    expect(parsePackUserMd(raw).context).not.toMatch(/The more you know/);
  });

  it("round-trips buildUserBlockMarkdown fields", () => {
    const md = buildUserBlockMarkdown({
      name: "N",
      whatToCall: "W",
      pronouns: "they",
      timezone: "X",
      notes: "Y",
      context: "Z",
    });
    expect(parsePackUserMd(md)).toMatchObject({
      name: "N",
      whatToCall: "W",
      pronouns: "they",
      timezone: "X",
      notes: "Y",
      context: "Z",
    });
  });

  it("strips _(optional)_ on pronouns line when empty", () => {
    const raw = `- **Pronouns:** _(optional)_`;
    expect(parsePackUserMd(raw).pronouns).toBeUndefined();
  });
});
