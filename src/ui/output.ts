import { BLUE, BOLD, DIM, GREEN, RED, RESET, WHITE, YELLOW } from "./colors";

export class AgpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgpError";
  }
}

export function info(msg: string): void {
  console.error(`${BLUE}  info${RESET}  ${msg}`);
}

export function warn(msg: string): void {
  console.error(`${YELLOW}  warn${RESET}  ${msg}`);
}

export function success(msg: string): void {
  console.error(`${GREEN}    ok${RESET}  ${msg}`);
}

export function error(msg: string): never {
  throw new AgpError(msg);
}

export function dim(msg: string): void {
  console.error(`${DIM}${msg}${RESET}`);
}

export function header(msg: string): void {
  console.error(`\n${BOLD}${WHITE}${msg}${RESET}`);
}
