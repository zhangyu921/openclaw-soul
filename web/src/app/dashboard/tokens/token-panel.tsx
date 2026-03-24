"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = { id: string; label: string | null; createdAt: string };

export default function TokenPanel({ initialTokens }: { initialTokens: Row[] }) {
  const router = useRouter();
  const [tokens, setTokens] = useState(initialTokens);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Use a token with the CLI:{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
          OPENCLAW_SOUL_TOKEN=... ocs publish --slug ... --title ...
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
