"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { Suspense, useState } from "react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AuthLoading } from "../login/auth-loading";

type Mode = "login" | "register";

function RegisterPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";

  const [mode, setMode] = useState<Mode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeHint, setCodeHint] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [codeSending, setCodeSending] = useState(false);

  async function onRequestCode() {
    setCodeError(null);
    setCodeHint(null);
    setCodeSending(true);
    try {
      const res = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intent: "register" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCodeError(typeof data.error === "string" ? data.error : t("emailCodeRequestFailed"));
        return;
      }
      if (typeof data.devCode === "string") {
        setCodeHint(t("emailCodeDevHint", { code: data.devCode }));
      } else {
        setCodeHint(t("registerEmailCodeSent"));
      }
    } finally {
      setCodeSending(false);
    }
  }

  async function onLogin(e: React.FormEvent) {
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

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          emailCode,
          password,
          acceptPrivacy,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("registerFailed"));
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-lg ring-1 ring-border/80">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="font-heading text-2xl">{t("registerPasswordPageTitle")}</CardTitle>
        <CardDescription>{t("registerPasswordPageSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 p-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "login" ? "default" : "ghost"}
            className="w-full"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            {t("registerPasswordTabLogin")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "register" ? "default" : "ghost"}
            className="w-full"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
          >
            {t("registerPasswordTabRegister")}
          </Button>
        </div>

        {mode === "login" ? (
          <form onSubmit={onLogin} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="rp-email">{t("loginEmail")}</Label>
              <Input
                id="rp-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-password">{t("loginPassword")}</Label>
              <Input
                id="rp-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-10"
              />
            </div>
            {error ? (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? t("loginSubmitting") : t("loginSubmit")}
            </Button>
          </form>
        ) : (
          <form onSubmit={onRegister} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="rp-reg-email">{t("loginEmail")}</Label>
              <Input
                id="rp-reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-reg-password">{t("registerPassword")}</Label>
              <Input
                id="rp-reg-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-reg-code">{t("registerEmailCodeLabel")}</Label>
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  id="rp-reg-code"
                  type="text"
                  required
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="h-10 min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => void onRequestCode()}
                  disabled={codeSending || loading || !email.trim()}
                >
                  {codeSending ? t("emailCodeSending") : t("registerEmailCodeSend")}
                </Button>
              </div>
              {codeHint ? <p className="text-xs text-muted-foreground">{codeHint}</p> : null}
              {codeError ? (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {codeError}
                </p>
              ) : null}
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/30 p-3">
              <Checkbox
                id="rp-privacy"
                checked={acceptPrivacy}
                onCheckedChange={(v) => setAcceptPrivacy(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="rp-privacy" className="cursor-pointer font-normal leading-snug text-muted-foreground">
                {t("registerPrivacy")}{" "}
                <Link href="/privacy" className={privacyLinkClassName} target="_blank" rel="noreferrer">
                  {t("registerPrivacyLink")}
                </Link>
                {t("registerPrivacyEnd")}
              </Label>
            </div>
            {error ? (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="w-full" disabled={loading || !acceptPrivacy}>
              {loading ? t("registerSubmitting") : t("registerSubmit")}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
        <p>
          <Link
            href={next !== "/dashboard" ? { pathname: "/login", query: { next } } : "/login"}
            className="text-muted-foreground/90 underline-offset-4 hover:underline"
          >
            {t("registerBackToCodeLogin")}
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

export default function RegisterPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Suspense fallback={<AuthLoading />}>
        <RegisterPasswordForm />
      </Suspense>
    </div>
  );
}
