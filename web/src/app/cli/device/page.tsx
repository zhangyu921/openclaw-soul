import { Suspense } from "react";

import DeviceClient from "./device-client";

export default function CliDevicePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Loading…
          </p>
        }
      >
        <DeviceClient />
      </Suspense>
    </div>
  );
}
