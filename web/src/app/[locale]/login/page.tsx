import { Suspense } from "react";

import LoginForm from "./login-form";
import { AuthLoading } from "./auth-loading";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24">
      <Suspense fallback={<AuthLoading />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
