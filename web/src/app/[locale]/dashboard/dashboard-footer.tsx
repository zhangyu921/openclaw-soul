import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import { Separator } from "@/components/ui/separator";

export async function DashboardFooter() {
  const t = await getTranslations("dashboard");

  return (
    <div className="mx-auto w-full max-w-lg">
      <Separator className="my-10" />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          {t("backToGallery")}
        </Link>
      </p>
    </div>
  );
}
