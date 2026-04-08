import type { ReactNode } from "react";

import "./globals.css";

// Root segment passes through; `<html>` / `<body>` live in `[locale]/layout.tsx`
// (see next-intl example-app-router).
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
