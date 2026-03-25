import Link from "next/link";

export const metadata = {
  title: "Privacy & uploads — OpenClaw Soul",
  description: "How we handle workspace pack uploads and your responsibilities",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="text-sm text-zinc-500 underline">
            ← Gallery
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Privacy &amp; uploads</h1>
        <p className="mt-2 text-sm text-zinc-500">隐私说明与上传同意（OpenClaw Soul registry）</p>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <p>
            本服务允许你通过 CLI 或（未来）网页上传 <strong>OpenClaw workspace</strong>{" "}
            的完整目录压缩包（zip）。上传即表示你已阅读本页，并<strong>自愿承担</strong>
            所上传内容的法律与隐私风险。
          </p>
          <p>
            <strong>可能包含敏感内容。</strong> Workspace 常含{" "}
            <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">MEMORY.md</code>、
            个人偏好、工具配置、路径或第三方 API 痕迹等。当前 MVP{" "}
            <strong>不会</strong>自动脱敏、扫描或删除其中文件；请你自行检查后再发布。
          </p>
          <p>
            <strong>存储与展示。</strong> 我们会将 zip 与可选头像保存在服务端（默认本地目录或你配置的对象存储），并在画廊中公开展示元数据（标题、摘要、handle/slug）及下载链接。请勿上传你无权分享或违法的内容。
          </p>
          <p id="revoke">
            <strong>撤销展示。</strong> 你可以在 pack 详情页使用「从画廊下架」：记录与文件仍保留在数据库与磁盘中（便于审计与后续功能），但画廊、公开页与下载将对他人不可用。你仍可通过 CLI 使用{" "}
            <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">--replace</code>{" "}
            再次上传同一 slug 以重新公开（会清除撤销状态）。
          </p>
          <p>
            <strong>技术限制（MVP）。</strong> 单包 zip 上限 <strong>2 MiB</strong>；头像在服务端校验上限{" "}
            <strong>512 KiB</strong>（网页上传与 CLI 发布会在<strong>你的浏览器或本机</strong>先压缩后再传，一般无需手动缩小）。
            同一账号约 <strong>每自然小时 20 次</strong>{" "}
            成功发布（新建或覆盖）会触发频率限制，以防止滥用。
          </p>
          <p className="text-zinc-500 dark:text-zinc-400">
            English summary: By uploading, you agree you have read this page and accept full responsibility
            for the content. We store full zips as-is (no redaction in MVP). You may soft-revoke public
            visibility without deleting server-side data; limits apply as stated above. Avatars are
            compressed client-side before upload; the server enforces a 512 KiB cap as a safeguard.
          </p>
        </section>

        <p className="mt-10 text-sm">
          <Link href="/register" className="text-zinc-600 underline dark:text-zinc-400">
            Register
          </Link>
          {" · "}
          <Link href="/login" className="text-zinc-600 underline dark:text-zinc-400">
            Login
          </Link>
        </p>
      </main>
    </div>
  );
}
