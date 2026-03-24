"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = { id: string; label: string | null; createdAt: string };

export default function TokenPanel({
  initialTokens,
  publicHandle,
}: {
  initialTokens: Row[];
  publicHandle: string | null;
}) {
  const router = useRouter();
  const [tokens, setTokens] = useState(initialTokens);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [handleError, setHandleError] = useState<string | null>(null);
  const [handleSaving, setHandleSaving] = useState(false);
  const [handleDone, setHandleDone] = useState(publicHandle);

  async function createToken() {
    setError(null);
    setNewToken(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed");
        return;
      }
      if (typeof data.token === "string") setNewToken(data.token);
      setLabel("");
      const list = await fetch("/api/tokens");
      const j = await list.json();
      if (Array.isArray(j.tokens)) {
        setTokens(
          j.tokens.map((t: { id: string; label: string | null; createdAt: string }) => ({
            ...t,
            createdAt: t.createdAt,
          }))
        );
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function saveHandle() {
    setHandleError(null);
    setHandleSaving(true);
    try {
      const res = await fetch("/api/me/handle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handleInput.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setHandleError(typeof data.error === "string" ? data.error : "Failed");
        return;
      }
      if (typeof data.handle === "string") setHandleDone(data.handle);
      setHandleInput("");
      router.refresh();
    } finally {
      setHandleSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">API tokens</h1>
        <button
          type="button"
          onClick={() => logout()}
          className="text-sm text-zinc-500 underline"
        >
          Log out
        </button>
      </div>

      {!handleDone ? (
        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
          <p className="mb-2 font-medium text-amber-900 dark:text-amber-100">
            Set your public handle (required for <code className="rounded px-1">ocs publish</code> and
            pack URLs). Lowercase letters, digits, hyphens only. One-time.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-amber-950 dark:text-amber-50">
              Handle
              <input
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                className="rounded border border-amber-300 bg-white px-3 py-2 text-zinc-900 dark:border-amber-800 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="your-handle"
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              disabled={handleSaving || !handleInput.trim()}
              onClick={() => saveHandle()}
              className="rounded bg-amber-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-amber-200 dark:text-amber-950"
            >
              {handleSaving ? "…" : "Save handle"}
            </button>
          </div>
          {handleError ? <p className="mt-2 text-red-600 dark:text-red-400">{handleError}</p> : null}
        </div>
      ) : (
        <p className="mb-6 text-sm text-zinc-500">
          Public handle:{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">{handleDone}</code> (used in
          /packs/&lt;handle&gt;/&lt;slug&gt;)
        </p>
      )}

      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/privacy" className="underline">
          Privacy &amp; uploads
        </Link>
        ：使用 <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">ocs publish</code>{" "}
        即表示你同意其中关于全量 zip、无自动脱敏及撤销不删库等说明。
      </p>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Prefer browser login: run{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">ocs login</code>{" "}
        (or <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">npm run ocs -- login</code>{" "}
        from the repo root) — token is saved to your user config{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">env</code> file. Or paste a
        token below for scripts / CI:{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
          OPENCLAW_SOUL_TOKEN=... ocs publish ...
        </code>
      </p>

      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Label (optional)
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="laptop"
          />
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={() => createToken()}
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "…" : "New token"}
        </button>
      </div>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {newToken ? (
        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
          <p className="mb-2 font-medium text-amber-900 dark:text-amber-100">
            Copy now — shown once:
          </p>
          <code className="block break-all text-amber-950 dark:text-amber-50">{newToken}</code>
        </div>
      ) : null}

      <h2 className="mb-3 text-sm font-medium text-zinc-500">Existing tokens</h2>
      {tokens.length === 0 ? (
        <p className="text-sm text-zinc-500">None yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex justify-between rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <span>{t.label || "(no label)"}</span>
              <span className="text-zinc-400">
                {new Date(t.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-sm">
        <Link href="/" className="text-zinc-500 underline">
          ← Home
        </Link>
      </p>
    </div>
  );
}
