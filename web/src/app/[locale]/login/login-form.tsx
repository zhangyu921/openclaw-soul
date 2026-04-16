"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { GithubMark } from "@/components/icons/github-mark";
import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { privacyLinkClassName } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
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
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSentHint, setCodeSentHint] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [codeVerifying, setCodeVerifying] = useState(false);
  const [emailExpanded, setEmailExpanded] = useState(false);

  function onGithubLogin() {
    setOauthLoading(true);
    const href = `/api/auth/github/start?next=${encodeURIComponent(next)}&locale=${encodeURIComponent(locale)}`;
    window.location.assign(href);
  }

  async function onRequestCode() {
    setCodeError(null);
    setCodeSentHint(null);
    setCodeSending(true);
    try {
      const res = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
        body: JSON.stringify({ email, code }),
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
    <Card className="w-full max-w-md border-0 shadow-lg ring-1 ring-border/80 py-8">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="font-heading text-2xl">{t("loginTitle")}</CardTitle>
        <CardDescription>{t("loginSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          size="lg"
          className="w-full gap-2"
          disabled={oauthLoading || codeVerifying}
          onClick={onGithubLogin}
        >
          <GithubMark className="size-5 shrink-0" />
          {oauthLoading ? t("githubLoginSubmitting") : t("githubLogin")}
        </Button>
        <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
          <span>{t("loginLegalIntro")}</span>
          <Link href="/privacy" className={privacyLinkClassName}>
            {t("registerPrivacyLink")}
          </Link>
          <span className="text-muted-foreground/50" aria-hidden>
            {" "}
            ·{" "}
          </span>
          <Link href="/" className={privacyLinkClassName}>
            {t("homeLink")}
          </Link>
          {t("loginLegalOutro")}
        </p>
        {githubError ? (
          <p className="text-sm font-medium text-destructive" role="alert">
            {t("githubLoginFailed")}
          </p>
        ) : null}
        {!emailExpanded ? (
          <div className="text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setEmailExpanded(true)}
            >
              {t("loginEmailAuthExpand")}
            </button>
          </div>
        ) : (
          <div className="space-y-4 border-t border-border/80 pt-4">
            <div className="flex justify-center">
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setEmailExpanded(false)}
              >
                {t("emailAuthCollapse")}
              </button>
            </div>
            <div className="space-y-4">
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

              <form onSubmit={onVerifyCode} className="flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">{t("emailCodeTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("emailCodeHint")}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={onRequestCode}
                  disabled={codeSending || codeVerifying}
                >
                  {codeSending ? t("emailCodeSending") : t("emailCodeSend")}
                </Button>
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
                <Button type="submit" size="lg" className="w-full" disabled={codeVerifying || codeSending}>
                  {codeVerifying ? t("emailCodeVerifying") : t("emailCodeSubmit")}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground/90">
                <Link
                  href={{ pathname: "/register", query: { next } }}
                  className="underline-offset-4 hover:text-muted-foreground hover:underline"
                >
                  {t("authPasswordEntry")}
                </Link>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
