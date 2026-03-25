import { Suspense } from "react";

import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Loading…
          </p>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
