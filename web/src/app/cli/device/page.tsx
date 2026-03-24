import { Suspense } from "react";
import DeviceClient from "./device-client";

export default function CliDevicePage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <DeviceClient />
      </Suspense>
    </div>
  );
}
