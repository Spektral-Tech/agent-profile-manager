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
