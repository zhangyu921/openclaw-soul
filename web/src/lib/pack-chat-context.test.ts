import { describe, expect, it } from "vitest";

import { DEFAULT_PACK_AGENTS_MD } from "./default-pack-agents-md";
import { buildPackChatSystemPrompt } from "./pack-chat-context";

describe("buildPackChatSystemPrompt", () => {
  it("injects platform AGENTS, optional USER-UPLOAD-AGENTS, then SOUL, IDENTITY, USER", () => {
    const text = buildPackChatSystemPrompt({
      soul: "<<S>>",
      identity: "<<I>>",
      userBlock: "<<U>>",
      agentsUserUpload: "<<UP>>",
    });
    expect(text).toContain("## AGENTS.md（OpenClaw Soul）");
    expect(text).toContain("## USER-UPLOAD-AGENTS.md");
    const iUp = text.indexOf("<<UP>>");
    const iS = text.indexOf("<<S>>");
    const iI = text.indexOf("<<I>>");
    const iUser = text.indexOf("<<U>>");
    expect(iUp).toBeGreaterThanOrEqual(0);
    expect(iS).toBeGreaterThan(iUp);
    expect(iI).toBeGreaterThan(iS);
    expect(iUser).toBeGreaterThan(iI);
  });

  it("omits USER-UPLOAD-AGENTS when authors did not upload AGENTS.md", () => {
    const text = buildPackChatSystemPrompt({
      soul: "<<S>>",
      identity: "<<I>>",
      userBlock: "<<U>>",
      agentsUserUpload: null,
    });
    expect(text).not.toContain("## USER-UPLOAD-AGENTS.md");
    expect(text.indexOf("<<S>>")).toBeGreaterThan(0);
  });
});

describe("DEFAULT_PACK_AGENTS_MD", () => {
  it("loads from default-pack-agents.md and documents Soul-global rules", () => {
    expect(DEFAULT_PACK_AGENTS_MD.startsWith("# AGENTS.md")).toBe(true);
    expect(DEFAULT_PACK_AGENTS_MD).toContain("OpenClaw Soul");
    expect(DEFAULT_PACK_AGENTS_MD).toContain("USER-UPLOAD-AGENTS");
  });
});
