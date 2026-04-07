import { afterEach, describe, expect, it } from "vitest";

import { resolvePackChatModel } from "./chat-model";

function clearChatEnv() {
  delete process.env.OLLAMA_BASE_URL;
  delete process.env.OLLAMA_MODEL;
  delete process.env.MINIMAX_TOKEN_PLAN_API_KEY;
  delete process.env.MINIMAX_ANTHROPIC_BASE_URL;
  delete process.env.MINIMAX_CHAT_MODEL;
}

describe("resolvePackChatModel", () => {
  afterEach(() => {
    clearChatEnv();
  });

  it("returns null when no backends are configured", () => {
    clearChatEnv();
    expect(resolvePackChatModel()).toBeNull();
  });

  it("prefers Ollama when OLLAMA_BASE_URL is set", () => {
    clearChatEnv();
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
    process.env.MINIMAX_TOKEN_PLAN_API_KEY = "mk-minimax";
    expect(resolvePackChatModel()).not.toBeNull();
  });

  it("uses MiniMax when Token Plan key is set and Ollama is not", () => {
    clearChatEnv();
    process.env.MINIMAX_TOKEN_PLAN_API_KEY = "token-plan-key";
    expect(resolvePackChatModel()).not.toBeNull();
  });
});
