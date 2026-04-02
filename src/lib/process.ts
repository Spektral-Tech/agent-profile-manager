import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";

export async function execCli(
  binary: string,
  args: string[],
  env: Record<string, string>,
): Promise<never> {
  const proc = spawn(binary, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  const code = await new Promise<number>((resolve, reject) => {
    proc.once("error", reject);
    proc.once("close", (exitCode) => resolve(exitCode ?? 1));
  });
  process.exit(code);
}

export function openDesktopApp(appName: string, profileDir: string): void {
  const proc = spawn(
    "open",
    ["-n", "-a", appName, "--args", `--user-data-dir=${profileDir}`],
    {
      stdio: "ignore",
      detached: true,
    },
  );
  proc.unref();
}

export function launchCodexDesktop(
  binaryPath: string,
  profileDir: string,
): void {
  const proc = spawn(binaryPath, [], {
    stdio: "ignore",
    detached: true,
    env: { ...process.env, CODEX_HOME: profileDir },
  });
  proc.unref();
}

export async function interactiveShell(
  env: Record<string, string>,
): Promise<number> {
  const shell = process.env.SHELL ?? "/bin/zsh";
  const proc = spawn(shell, [], {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  return new Promise<number>((resolve, reject) => {
    proc.once("error", reject);
    proc.once("close", (code) => resolve(code ?? 1));
  });
}

export async function commandExists(binary: string): Promise<boolean> {
  const pathEnv = process.env.PATH ?? "";
  const paths = pathEnv.split(":").filter(Boolean);

  for (const dir of paths) {
    try {
      await access(`${dir}/${binary}`, constants.X_OK);
      return true;
    } catch {
      // try next location
    }
  }

  return false;
}
