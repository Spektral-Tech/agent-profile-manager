const isTTY = process.stderr.isTTY ?? false;

function code(c: string): string {
  return isTTY ? c : "";
}

export const RESET = code("\x1b[0m");
export const BOLD = code("\x1b[1m");
export const DIM = code("\x1b[2m");
export const RED = code("\x1b[0;31m");
export const GREEN = code("\x1b[0;32m");
export const YELLOW = code("\x1b[0;33m");
export const BLUE = code("\x1b[0;34m");
export const MAGENTA = code("\x1b[0;35m");
export const CYAN = code("\x1b[0;36m");
export const WHITE = code("\x1b[1;37m");

/** Returns an ANSI truecolor fg sequence for the given hex color, or "" if not a TTY or invalid. */
export function hexColor(hex: string): string {
  if (!isTTY) return "";
  const m = hex.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return "";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `\x1b[38;2;${r};${g};${b}m`;
}
