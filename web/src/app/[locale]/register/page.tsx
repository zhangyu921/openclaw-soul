"use client";

import { useSearchParams } from "next/navigation";

import { Link, useRouter } from "@/i18n/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { privacyLinkClassName } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <Card className="w-full max-w-md border-0 shadow-lg ring-1 ring-border/80">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="font-heading text-2xl">Create account</CardTitle>
        <CardDescription>注册后即可发布与展示你的 OpenClaw pack</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="reg-email">Email</Label>
            <Input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-handle">Public handle</Label>
            <Input
              id="reg-handle"
              type="text"
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="username"
              placeholder="your-handle"
              className="h-10 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              小写字母、数字、连字符；用于 /packs/&lt;handle&gt;/…
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">Password (min 8)</Label>
            <Input
              id="reg-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="h-10"
            />
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/30 p-3">
            <Checkbox
              id="reg-privacy"
              checked={acceptPrivacy}
              onCheckedChange={(v) => setAcceptPrivacy(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="reg-privacy" className="cursor-pointer font-normal leading-snug text-muted-foreground">
              我已阅读并同意{" "}
              <Link
                href="/privacy"
                className={privacyLinkClassName}
                target="_blank"
                rel="noreferrer"
              >
                隐私与上传说明
              </Link>
              。
            </Label>
          </div>
          {error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={loading || !acceptPrivacy}>
            {loading ? "…" : "Create account"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
        <p>
          Already have an account?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Login
          </Link>
        </p>
        <p>
          <Link href="/privacy" className={privacyLinkClassName}>
            Privacy
          </Link>
          <span className="text-muted-foreground/40" aria-hidden>
            {" "}
            ·{" "}
          </span>
          <Link href="/" className={privacyLinkClassName}>
            Home
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Loading…
          </p>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
