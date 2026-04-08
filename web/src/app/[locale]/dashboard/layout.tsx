import { DashboardFooter } from "./dashboard-footer";
import { DashboardNav } from "./dashboard-nav";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto w-full max-w-[var(--container-max)] px-4 py-6 sm:px-6">
      <DashboardNav />
      {children}
      <DashboardFooter />
    </div>
  );
}
