import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliRoot = path.join(root, "packages", "cli");
/** pnpm / npm `run ocs -- …` 会在子进程 argv 里多插入一个 `--` */
const raw = process.argv.slice(2);
const args = raw[0] === "--" ? raw.slice(1) : raw;

const child = spawn("pnpm", ["exec", "tsx", "src/index.ts", ...args], {
  cwd: cliRoot,
  stdio: "inherit",
  env: process.env,
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
