import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DashboardFooter } from "./dashboard-footer";
import { DashboardNav } from "./dashboard-nav";

type Props = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto w-full max-w-[var(--container-max)] px-4 py-6 sm:px-6">
      <DashboardNav />
      {children}
      <DashboardFooter />
    </div>
  );
}
