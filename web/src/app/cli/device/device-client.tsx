"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function DeviceClient() {
  const router = useRouter();
  const search = useSearchParams();
  const fromQuery = search.get("user_code")?.trim() || "";
  const [userCode, setUserCode] = useState(fromQuery);
  const [me, setMe] = useState<{ email: string } | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const refreshMe = useCallback(async () => {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (data.user) setMe({ email: data.user.email });
    else setMe(null);
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    if (fromQuery) setUserCode(fromQuery);
  }, [fromQuery]);

  const loginNext = `/cli/device?user_code=${encodeURIComponent(userCode.trim())}`;

  async function approve() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/device/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_code: userCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Approve failed");
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <>
        <h1 className="mb-4 text-2xl font-semibold">CLI authorized</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          You can close this tab and return to the terminal.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/" className="text-zinc-500 underline">
            ← Home
          </Link>
        </p>
      </>
    );
  }

  if (me === undefined) {
    return <p className="text-zinc-500">Checking session…</p>;
  }

  if (me === null) {
    return (
      <>
        <h1 className="mb-4 text-2xl font-semibold">Authorize CLI</h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Log in to approve access for your OpenClaw Soul CLI.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(loginNext)}`}
          className="inline-block rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Log in
        </Link>
        <p className="mt-4 text-sm text-zinc-500">
          No account?{" "}
          <Link
            href={`/register?next=${encodeURIComponent(loginNext)}`}
            className="underline"
          >
            Register
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Authorize CLI</h1>
      <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
        Signed in as <span className="font-medium text-zinc-800 dark:text-zinc-200">{me.email}</span>
      </p>
      <label className="mb-4 flex flex-col gap-1 text-sm">
        User code
        <input
          value={userCode}
          onChange={(e) => setUserCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX"
          className="rounded border border-zinc-300 px-3 py-2 font-mono dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={busy || !userCode.trim()}
        onClick={() => approve()}
        className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {busy ? "…" : "Approve CLI access"}
      </button>
      <p className="mt-6 text-sm">
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
            setMe(null);
            router.refresh();
          }}
          className="text-zinc-500 underline"
        >
          Use a different account
        </button>
      </p>
      <p className="mt-4 text-sm">
        <Link href="/" className="text-zinc-500 underline">
          ← Home
        </Link>
      </p>
    </>
  );
}
