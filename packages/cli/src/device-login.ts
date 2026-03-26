import { openBrowser } from "./open-browser.js";
import {
  fetchRegistry,
  isConnectTimeoutError,
  isTransientNetworkError,
} from "./fetch-registry.js";
import { getUserEnvFilePath } from "./user-config-path.js";

/** Appended when registry connection fails; old CLI / env mismatches are common. */
const UPDATE_CLI_HINT =
  "若问题持续，请更新 CLI：`npm i -g @openclaw-soul/cli@latest`，或使用 `npx @openclaw-soul/cli@latest login`。";

function isConnectionRefused(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { code?: string; cause?: unknown };
  if (err.code === "ECONNREFUSED") return true;
  const c = err.cause;
  if (c && typeof c === "object") {
    const c1 = c as { code?: string; errors?: { code?: string }[] };
    if (c1.code === "ECONNREFUSED") return true;
    if (Array.isArray(c1.errors)) {
      return c1.errors.some((x) => x?.code === "ECONNREFUSED");
    }
  }
  return false;
}

async function registryFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetchRegistry(url, init);
  } catch (e) {
    if (isConnectionRefused(e)) {
      let origin = url;
      try {
        origin = new URL(url).origin;
      } catch {
        /* keep */
      }
      const userEnvFile = getUserEnvFilePath();
      const devHint =
        origin.includes("localhost") || origin.includes("127.0.0.1")
          ? `若本意连本机 registry：先在仓库根启动站点（如 pnpm run dev），必要时设置 OPENCLAW_SOUL_API。若本意连线上：请检查 shell 里的 OPENCLAW_SOUL_API，或编辑/删除用户配置里的误留项（常见为旧版写入的 localhost）：${userEnvFile}`
          : "请检查网络/代理，或确认 OPENCLAW_SOUL_API 指向正确的线上 registry。";
      throw new Error(
        `无法连接 registry（${origin}，连接被拒绝）。${devHint} ${UPDATE_CLI_HINT}`
      );
    }
    if (isConnectTimeoutError(e)) {
      let origin = url;
      try {
        origin = new URL(url).origin;
      } catch {
        /* keep */
      }
      throw new Error(
        `无法及时连上 registry（${origin}，连接超时）。可调大 OPENCLAW_SOUL_CONNECT_TIMEOUT_MS（默认 60000）；若浏览器能开站点但 CLI 不行，可设 HTTPS_PROXY 与浏览器一致。${UPDATE_CLI_HINT}`
      );
    }
    if (isTransientNetworkError(e)) {
      let origin = url;
      try {
        origin = new URL(url).origin;
      } catch {
        /* keep */
      }
      throw new Error(
        `与 registry 通信中断（${origin}）。已内置重试仍失败时请检查网络，或设置 HTTPS_PROXY；可调大 OPENCLAW_SOUL_FETCH_MAX_RETRIES。${UPDATE_CLI_HINT}`
      );
    }
    throw e;
  }
}

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
  const startRes = await registryFetch(`${base}/api/auth/device/start`, {
    method: "POST",
  });
  const startText = await startRes.text();
  if (!startRes.ok) {
    let detail = startText.slice(0, 800);
    try {
      const j = JSON.parse(startText) as { message?: string; error?: string };
      if (j.message) detail = j.message;
      else if (j.error) detail = `${j.error}: ${detail}`;
    } catch {
      /* use raw */
    }
    throw new Error(
      `device/start failed (${startRes.status}): ${detail.trim() || startText}`
    );
  }
  const start = JSON.parse(startText) as DeviceStartResponse;
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

    const tokenRes = await registryFetch(`${base}/api/auth/device/token`, {
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
