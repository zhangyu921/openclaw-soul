import { Link } from "@/i18n/navigation";

import { Separator } from "@/components/ui/separator";

export function DashboardFooter() {
  return (
    <div className="mx-auto w-full max-w-lg">
      <Separator className="my-10" />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="underline-offset-4 hover:underline">
          ← Gallery
        </Link>
      </p>
    </div>
  );
}
