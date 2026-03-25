"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next");
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          handle: handle.trim().toLowerCase(),
          acceptPrivacy,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Register failed");
        return;
      }
      const loginHref = next
        ? `/login?next=${encodeURIComponent(next)}`
        : "/login";
      router.push(loginHref);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Register</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Public handle (for /packs/&lt;handle&gt;/… — lowercase, letters, digits, hyphens)
          <input
            type="text"
            required
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoComplete="username"
            className="rounded border border-zinc-300 px-3 py-2 font-mono dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="your-handle"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password (min 8)
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={acceptPrivacy}
            onChange={(e) => setAcceptPrivacy(e.target.checked)}
            className="mt-1"
          />
          <span>
            我已阅读并同意{" "}
            <Link href="/privacy" className="underline" target="_blank" rel="noreferrer">
              隐私与上传说明
            </Link>
            。
          </span>
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !acceptPrivacy}
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          href={
            next ? `/login?next=${encodeURIComponent(next)}` : "/login"
          }
          className="underline"
        >
          Login
        </Link>
      </p>
      <p className="mt-4 text-sm text-zinc-500">
        <Link href="/privacy" className="underline">
          Privacy &amp; uploads
        </Link>
        {" · "}
        <Link href="/" className="underline">
          ← Home
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm px-6 py-16 text-zinc-500">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
