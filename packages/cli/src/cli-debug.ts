/** Set by commands that support `--debug` (e.g. `apply`). */
let cliDebug = false;

export function setCliDebug(on: boolean): void {
  cliDebug = on;
}

export function isCliDebug(): boolean {
  return cliDebug;
}

/** stderr only when `--debug` is on. */
export function dbg(...args: unknown[]): void {
  if (cliDebug) console.error(...args);
}
