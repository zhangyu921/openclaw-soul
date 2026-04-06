import { describe, expect, it } from "vitest";

import { buildPackChatSystemPrompt } from "./pack-chat-context";

describe("buildPackChatSystemPrompt", () => {
  it("orders SOUL then IDENTITY then USER then AGENTS", () => {
    const text = buildPackChatSystemPrompt({
      soul: "<<SOUL_BODY>>",
      identity: "<<ID_BODY>>",
      userBlock: "<<USER_BODY>>",
      agents: "<<AG_BODY>>",
    });
    const iSoul = text.indexOf("<<SOUL_BODY>>");
    const iId = text.indexOf("<<ID_BODY>>");
    const iUser = text.indexOf("<<USER_BODY>>");
    const iAgents = text.indexOf("<<AG_BODY>>");
    expect(iSoul).toBeGreaterThanOrEqual(0);
    expect(iId).toBeGreaterThan(iSoul);
    expect(iUser).toBeGreaterThan(iId);
    expect(iAgents).toBeGreaterThan(iUser);
  });
});
