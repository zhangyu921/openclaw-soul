"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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

export default function DeviceClient() {
  const t = useTranslations("cliDevice");
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
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
        setError(typeof data.error === "string" ? data.error : t("approveFailed"));
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card className="w-full max-w-md border-0 shadow-lg ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-xl">{t("doneTitle")}</CardTitle>
          <CardDescription>{t("doneBody")}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="link" className="px-0" render={<Link href="/" />}>
            {t("homeLink")}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (me === undefined) {
    return (
      <p className="text-center text-sm text-muted-foreground" aria-live="polite">
        {t("checking")}
      </p>
    );
  }

  if (me === null) {
    return (
      <Card className="w-full max-w-md border-0 shadow-lg ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="font-heading text-xl">{t("needLoginTitle")}</CardTitle>
          <CardDescription>{t("needLoginBody")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" render={<Link href={`/login?next=${encodeURIComponent(loginNext)}`} />}>
            {tNav("login")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {tAuth("noAccount")}{" "}
            <Link
              href={`/register?next=${encodeURIComponent(loginNext)}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {tNav("register")}
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-lg ring-1 ring-border/80">
      <CardHeader>
        <CardTitle className="font-heading text-xl">{t("signedInTitle")}</CardTitle>
        <CardDescription>
          {t("signedInBody")} <span className="font-medium text-foreground">{me.email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="device-user-code">{t("userCodeLabel")}</Label>
          <Input
            id="device-user-code"
            value={userCode}
            onChange={(e) => setUserCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            className="h-10 font-mono uppercase"
          />
        </div>
        {error ? (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="button" className="w-full" disabled={busy || !userCode.trim()} onClick={() => approve()}>
          {busy ? t("busy") : t("approveCta")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
            setMe(null);
            router.refresh();
          }}
        >
          {t("switchAccount")}
        </Button>
      </CardContent>
      <CardFooter>
        <Button variant="link" className="px-0" render={<Link href="/" />}>
          {t("homeLink")}
        </Button>
      </CardFooter>
    </Card>
  );
}
