import { Suspense } from "react";

import DeviceClient from "./device-client";
import { AuthLoading } from "../../login/auth-loading";

export default function CliDevicePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Suspense fallback={<AuthLoading />}>
        <DeviceClient />
      </Suspense>
    </div>
  );
}
