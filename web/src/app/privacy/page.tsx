import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "Privacy & uploads — OpenClaw Soul",
  description: "How we handle workspace pack uploads and your responsibilities",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Privacy &amp; uploads</h1>
        <p className="mt-2 text-sm text-muted-foreground">隐私说明与上传同意（OpenClaw Soul registry）</p>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-border/80">
        <CardHeader>
          <CardTitle className="text-lg">要点</CardTitle>
          <CardDescription>上传前请完整阅读；继续使用本服务即表示理解以下风险。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            本服务允许你通过 CLI 或（未来）网页上传 <strong className="text-foreground">OpenClaw workspace</strong>{" "}
            的完整目录压缩包（zip）。上传即表示你已阅读本页，并<strong className="text-foreground">自愿承担</strong>
            所上传内容的法律与隐私风险。
          </p>
          <Separator />
          <p>
            <strong className="text-foreground">可能包含敏感内容。</strong> Workspace 常含{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">MEMORY.md</code>、
            个人偏好、工具配置、路径或第三方 API 痕迹等。当前 MVP{" "}
            <strong className="text-foreground">不会</strong>自动脱敏、扫描或删除其中文件；请你自行检查后再发布。
          </p>
          <Separator />
          <p>
            <strong className="text-foreground">存储与展示。</strong> 我们会将 zip 与可选头像保存在服务端（默认本地目录或你配置的对象存储），并在画廊中公开展示元数据（标题、摘要、handle/slug）及下载链接。请勿上传你无权分享或违法的内容。
          </p>
          <Separator />
          <p id="revoke">
            <strong className="text-foreground">撤销展示。</strong> 你可以在 pack 详情页使用「从画廊下架」：记录与文件仍保留在数据库与磁盘中（便于审计与后续功能），但画廊、公开页与下载将对他人不可用。你仍可通过 CLI 使用{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">--replace</code>{" "}
            再次上传同一 slug 以重新公开（会清除撤销状态）。
          </p>
          <Separator />
          <p>
            <strong className="text-foreground">技术限制（MVP）。</strong> 单包 zip 上限 <strong>2 MiB</strong>；头像在服务端校验上限{" "}
            <strong>512 KiB</strong>（网页上传与 CLI 发布会在<strong className="text-foreground">你的浏览器或本机</strong>先压缩后再传，一般无需手动缩小）。
            同一账号约 <strong>每自然小时 20 次</strong>{" "}
            成功发布（新建或覆盖）会触发频率限制，以防止滥用。
          </p>
          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            English summary: By uploading, you agree you have read this page and accept full responsibility
            for the content. We store full zips as-is (no redaction in MVP). You may soft-revoke public
            visibility without deleting server-side data; limits apply as stated above. Avatars are
            compressed client-side before upload; the server enforces a 512 KiB cap as a safeguard.
          </p>
        </CardContent>
      </Card>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Register
        </Link>
        {" · "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Login
        </Link>
        {" · "}
        <Link href="/" className="underline-offset-4 hover:underline">
          Gallery
        </Link>
      </p>
    </main>
  );
}
