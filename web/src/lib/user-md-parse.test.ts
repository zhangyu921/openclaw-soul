import { describe, expect, it } from "vitest";

import { applyUserMdPlaceholders, DEFAULT_USER_MD_TEMPLATE } from "./user-md-template";
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
    const raw = `## Context

only this

---

The more you know, the better you can help.`;
    expect(parsePackUserMd(raw).context).toBe("only this");
  });

  it("round-trips default template after placeholder replace", () => {
    const md = applyUserMdPlaceholders(DEFAULT_USER_MD_TEMPLATE, {
      userHandle: "N",
      packHandle: "ph",
      packSlug: "ps",
      timezone: "X",
      pronouns: "they",
    });
    expect(parsePackUserMd(md)).toMatchObject({
      name: "N",
      whatToCall: "N",
      pronouns: "they",
      timezone: "X",
    });
  });

  it("strips _(optional)_ on pronouns line when empty", () => {
    const raw = `- **Pronouns:** _(optional)_`;
    expect(parsePackUserMd(raw).pronouns).toBeUndefined();
  });
});
