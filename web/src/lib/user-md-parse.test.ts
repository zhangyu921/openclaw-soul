import { describe, expect, it } from "vitest";

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
});
