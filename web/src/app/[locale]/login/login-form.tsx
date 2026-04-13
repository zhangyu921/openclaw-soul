"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { privacyLinkClassName } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";
  const githubError = search.get("error") === "github_oauth";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [codeEmail, setCodeEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSentHint, setCodeSentHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [codeVerifying, setCodeVerifying] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("loginFailed"));
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function onGithubLogin() {
    setOauthLoading(true);
    const href = `/api/auth/github/start?next=${encodeURIComponent(next)}&locale=${encodeURIComponent(locale)}`;
    window.location.assign(href);
  }

  async function onRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);
    setCodeSentHint(null);
    setCodeSending(true);
    try {
      const res = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: codeEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCodeError(typeof data.error === "string" ? data.error : t("emailCodeRequestFailed"));
        return;
      }
      if (typeof data.devCode === "string") {
        setCodeSentHint(t("emailCodeDevHint", { code: data.devCode }));
      } else {
        setCodeSentHint(t("emailCodeSent"));
      }
    } finally {
      setCodeSending(false);
    }
  }

  async function onVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);
    setCodeVerifying(true);
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: codeEmail, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCodeError(typeof data.error === "string" ? data.error : t("emailCodeVerifyFailed"));
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setCodeVerifying(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-lg ring-1 ring-border/80">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="font-heading text-2xl">{t("loginTitle")}</CardTitle>
        <CardDescription>{t("loginSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="mb-4 w-full"
          disabled={oauthLoading || loading}
          onClick={onGithubLogin}
        >
          {oauthLoading ? t("githubLoginSubmitting") : t("githubLogin")}
        </Button>
        <p className="mb-4 text-center text-xs text-muted-foreground">{t("oauthDivider")}</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">{t("loginEmail")}</Label>
            <Input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">{t("loginPassword")}</Label>
            <Input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-10"
            />
          </div>
          {error || githubError ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error || t("githubLoginFailed")}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? t("loginSubmitting") : t("loginSubmit")}
          </Button>
        </form>
        <div className="my-5 border-t border-border/70" />
        <form onSubmit={onRequestCode} className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">{t("emailCodeTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("emailCodeHint")}</p>
          <div className="space-y-2">
            <Label htmlFor="login-code-email">{t("loginEmail")}</Label>
            <Input
              id="login-code-email"
              type="email"
              required
              value={codeEmail}
              onChange={(e) => setCodeEmail(e.target.value)}
              autoComplete="email"
              className="h-10"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={codeSending || codeVerifying}
          >
            {codeSending ? t("emailCodeSending") : t("emailCodeSend")}
          </Button>
        </form>
        <form onSubmit={onVerifyCode} className="mt-3 flex flex-col gap-3">
          <div className="space-y-2">
            <Label htmlFor="login-code-input">{t("emailCodeLabel")}</Label>
            <Input
              id="login-code-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-10"
            />
          </div>
          {codeSentHint ? (
            <p className="text-xs text-muted-foreground" role="status">
              {codeSentHint}
            </p>
          ) : null}
          {codeError ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {codeError}
            </p>
          ) : null}
          <Button type="submit" size="sm" className="w-full" disabled={codeVerifying || codeSending}>
            {codeVerifying ? t("emailCodeVerifying") : t("emailCodeSubmit")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 text-center text-sm text-muted-foreground">
        <p>
          {t("noAccount")}{" "}
          <Link
            href={`/register?next=${encodeURIComponent(next)}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("registerLink")}
          </Link>
        </p>
        <p>
          <Link href="/privacy" className={privacyLinkClassName}>
            {t("registerPrivacyLink")}
          </Link>
          <span className="text-muted-foreground/40" aria-hidden>
            {" "}
            ·{" "}
          </span>
          <Link href="/" className={privacyLinkClassName}>
            {t("homeLink")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
