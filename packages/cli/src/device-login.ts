import { openBrowser } from "./open-browser.js";

type DeviceStartResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval?: number;
};

type DeviceTokenResponse =
  | { access_token: string; token_type?: string }
  | { error: string };

/** Browser device flow + poll until token (RFC 8628 style). */
export async function runDeviceLogin(apiBase: string): Promise<string> {
  const base = apiBase.replace(/\/$/, "");
  const startRes = await fetch(`${base}/api/auth/device/start`, {
    method: "POST",
  });
  if (!startRes.ok) {
    const t = await startRes.text();
    throw new Error(`device/start failed: ${startRes.status} ${t}`);
  }
  const start = (await startRes.json()) as DeviceStartResponse;
  if (!start.device_code || !start.verification_uri) {
    throw new Error("device/start: invalid response");
  }

  console.error("\nOpen this URL in your browser to authorize the CLI:\n");
  console.error(`  ${start.verification_uri}\n`);
  console.error(`User code: ${start.user_code}\n`);
  openBrowser(start.verification_uri);

  const intervalMs = (start.interval ?? 3) * 1000;
  let delay = 1000;

  for (;;) {
    await new Promise((r) => setTimeout(r, delay));
    delay = intervalMs;

    const tokenRes = await fetch(`${base}/api/auth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: start.device_code,
      }),
    });

    const data = (await tokenRes.json()) as DeviceTokenResponse;

    if (tokenRes.ok && "access_token" in data && data.access_token) {
      return data.access_token;
    }

    if ("error" in data && data.error === "authorization_pending") {
      continue;
    }

    const msg =
      "error" in data && typeof data.error === "string"
        ? data.error
        : await tokenRes.text();
    throw new Error(`device/token: ${msg}`);
  }
}
