# Pinterest 风格设计令牌（OpenClaw Soul Web）

**唯一事实源**：[`web/src/app/globals.css`](../web/src/app/globals.css) 中的 `:root`、`.dark` 与 `@theme inline`。本文档用于说明命名与用法；改色请改 CSS，再与 Figma Variables 对齐。

技术栈：**Tailwind CSS v4** + **shadcn/ui**（base-nova）。shadcn 的 `bg-primary`、`text-muted-foreground` 等已绑定到同一套语义变量。

---

## 颜色（语义）

| Token（CSS 变量） | 用途 |
|------------------|------|
| `--primary` | Pinterest 红（浅色 `#E60023` / 深色 `#FF3751`） |
| `--primary-hover` | 主按钮悬停 |
| `--primary-light` | 浅红底提示区 |
| `--primary-foreground` | 主色上的文字 |
| `--background` / `--foreground` | 页面主底与主字色 |
| `--background-secondary` / `--background-tertiary` | 次级区块底 |
| `--card` / `--card-foreground` | 卡片 |
| `--secondary` / `--muted` | 次要表面与弱化背景 |
| `--muted-foreground` | 辅助文案 |
| `--accent` / `--accent-foreground` | 强调底/字 |
| `--success` / `--warning` / `--info` 及 `-*-light` | 状态色（扩展） |
| `--destructive` | 危险操作 |
| `--border` / `--border-light` | 边框 |
| `--input` / `--input-background` / `--input-border` / `--input-focus` | 表单与聚焦环参考 |

Tailwind 扩展色（来自 `@theme inline`）：`bg-primary-hover`、`bg-success`、`bg-input-background` 等（按需使用）。

---

## 字体与字号

- 字体：Next.js **Geist**（`--font-geist-sans` / `--font-geist-mono`），在 `@theme` 中挂到 `--font-sans`。
- 字号参考变量：`--text-xs` … `--text-4xl`（`rem`），可用任意值类例如 `text-[length:var(--text-lg)]`。
- 字重参考：`--font-weight-normal` … `--font-weight-bold`。

日常优先用 Tailwind：`text-sm`、`font-semibold` 等。

---

## 间距（8px 网格）

`--spacing-xs`（4px）～ `--spacing-3xl`（64px）。  
`@theme` 中别名：`spacing-pin-*`（与 `p-pin-md`、`gap-pin-sm` 等类对应）。

---

## 圆角

- 基准：`--radius: 1rem`（16px），与 shadcn 的 `rounded-lg` 等联动。
- 胶囊按钮：Tailwind `rounded-full`。

---

## 阴影

`--shadow-sm` … `--shadow-xl`、`--shadow-hover`。  
`@theme` 中别名：`shadow-pin-sm` … `shadow-pin-hover`（若需 `shadow-pin-md` 等工具类）。

---

## 动画

`--transition-fast` / `--transition-base` / `--transition-slow`、`--ease-in-out` / `--ease-out`。  
组件层工具类：`.transition-smooth`。

---

## 布局

| 变量 | 默认 |
|------|------|
| `--container-max` | `1440px` |
| `--header-height` | `80px`（顶栏 `SiteHeader` 已用） |
| `--pin-gap` | `16px`（首页 masonry 列间距） |

---

## Z-index

`--z-dropdown` … `--z-tooltip`（见 `globals.css`）。顶栏使用 `z-[var(--z-sticky)]`。

---

## 组件层工具类

在 `globals.css` 的 `@layer components` 中：

- **`.btn-pinterest`** — 全圆角色主按钮（保存/强 CTA 风）
- **`.card-pinterest`** — 卡片悬停上浮 + 阴影（首页 pack 卡片已叠加使用）

---

## 在代码里怎么用

### shadcn 组件（推荐）

```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

<Button>默认即 primary 语义色</Button>
<Card className="card-pinterest">...</Card>
```

### 直接使用变量

```tsx
<button
  className="bg-primary text-primary-foreground hover:bg-[var(--primary-hover)]"
  type="button"
>
  保存
</button>
```

路径说明：UI 组件在 **`@/components/ui/*`**（不是 `@/app/components/...`）。

---

## 瀑布流（Masonry）

当前首页使用 **CSS 多列**（`columns` + `break-inside-avoid`），**未**安装 `react-responsive-masonry`。若以后要换 JS Masonry，可再加分包；令牌里的 `--pin-gap` 仍适用。

---

## 深色模式

由 **`next-themes`** 在 `<html>` 上切换 `class="dark"`。`.dark` 下变量见 `globals.css`（主色更亮、背景 `#121212` 等）。

---

## 与 Figma 同步建议

1. Figma Variables 名称尽量与 `--primary`、`--pin-gap` 等 **语义一致**。  
2. 改 Figma 后，把 **hex / 数字** 回填到 `globals.css` 的 `:root` / `.dark`。  
3. 无需在业务组件里写死 Pinterest 的 hex，优先 `bg-primary`、`var(--…)`。
