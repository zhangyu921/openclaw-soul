"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { privacyLinkClassName } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AuthLoading } from "../login/auth-loading";

function RegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next");
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
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
          emailCode,
          password,
          handle: handle.trim().toLowerCase(),
          acceptPrivacy,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("registerFailed"));
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
        <CardTitle className="font-heading text-2xl">{t("registerTitle")}</CardTitle>
        <CardDescription>{t("registerSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="reg-email">{t("loginEmail")}</Label>
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
            <Label htmlFor="reg-handle">{t("registerHandle")}</Label>
            <Input
              id="reg-handle"
              type="text"
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="username"
              placeholder={t("registerHandlePlaceholder")}
              className="h-10 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">{t("registerHandleHint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">{t("registerPassword")}</Label>
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
          <div className="space-y-2">
            <Label htmlFor="reg-code">{t("registerEmailCodeLabel")}</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="reg-code"
                type="text"
                required
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="h-10"
              />
              <Button
                type="button"
                variant="outline"
                onClick={onRequestCode}
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
              id="reg-privacy"
              checked={acceptPrivacy}
              onCheckedChange={(v) => setAcceptPrivacy(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="reg-privacy" className="cursor-pointer font-normal leading-snug text-muted-foreground">
              {t("registerPrivacy")}{" "}
              <Link
                href="/privacy"
                className={privacyLinkClassName}
                target="_blank"
                rel="noreferrer"
              >
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
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
        <p>
          {t("hasAccount")}{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("loginLink")}
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
        <RegisterForm />
      </Suspense>
    </div>
  );
}
