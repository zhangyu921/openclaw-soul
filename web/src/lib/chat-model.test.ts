import { afterEach, describe, expect, it } from "vitest";

import { resolvePackChatModel } from "./chat-model";

function clearChatEnv() {
  delete process.env.PACK_CHAT_PROVIDER;
  delete process.env.OLLAMA_BASE_URL;
  delete process.env.OLLAMA_MODEL;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_BASE_URL;
  delete process.env.DEEPSEEK_CHAT_MODEL;
  delete process.env.MINIMAX_TOKEN_PLAN_API_KEY;
  delete process.env.MINIMAX_ANTHROPIC_BASE_URL;
  delete process.env.MINIMAX_CHAT_MODEL;
}

describe("resolvePackChatModel", () => {
  afterEach(() => {
    clearChatEnv();
  });

  it("returns provider_unset when PACK_CHAT_PROVIDER is missing", () => {
    clearChatEnv();
    const r = resolvePackChatModel();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("provider_unset");
      expect(r.message).toContain("PACK_CHAT_PROVIDER");
    }
  });

  it("treats whitespace-only PACK_CHAT_PROVIDER as unset", () => {
    process.env.PACK_CHAT_PROVIDER = "   ";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("provider_unset");
  });

  it("returns provider_invalid for unknown provider", () => {
    process.env.PACK_CHAT_PROVIDER = "openai";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("provider_invalid");
  });

  it("normalizes provider case (deepseek)", () => {
    process.env.PACK_CHAT_PROVIDER = "DeEpSeEk";
    process.env.DEEPSEEK_API_KEY = "sk-test";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(true);
  });

  it("returns credentials_missing for ollama without OLLAMA_BASE_URL", () => {
    process.env.PACK_CHAT_PROVIDER = "ollama";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("credentials_missing");
      expect(r.message).toContain("OLLAMA_BASE_URL");
    }
  });

  it("returns ok for ollama when OLLAMA_BASE_URL is set", () => {
    process.env.PACK_CHAT_PROVIDER = "ollama";
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.model).toBeDefined();
  });

  it("returns credentials_missing for deepseek without DEEPSEEK_API_KEY", () => {
    process.env.PACK_CHAT_PROVIDER = "deepseek";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("credentials_missing");
      expect(r.message).toContain("DEEPSEEK_API_KEY");
    }
  });

  it("returns ok for deepseek when DEEPSEEK_API_KEY is set", () => {
    process.env.PACK_CHAT_PROVIDER = "deepseek";
    process.env.DEEPSEEK_API_KEY = "sk-test";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.model).toBeDefined();
  });

  it("returns credentials_missing for minimax without token key", () => {
    process.env.PACK_CHAT_PROVIDER = "minimax";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("credentials_missing");
      expect(r.message).toContain("MINIMAX_TOKEN_PLAN_API_KEY");
    }
  });

  it("returns ok for minimax when MINIMAX_TOKEN_PLAN_API_KEY is set", () => {
    process.env.PACK_CHAT_PROVIDER = "minimax";
    process.env.MINIMAX_TOKEN_PLAN_API_KEY = "token-plan-key";
    const r = resolvePackChatModel();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.model).toBeDefined();
  });
});
