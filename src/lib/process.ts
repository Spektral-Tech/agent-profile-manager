export async function execCli(
  binary: string,
  args: string[],
  env: Record<string, string>,
): Promise<never> {
  const proc = Bun.spawn([binary, ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, ...env },
  });
  const code = await proc.exited;
  process.exit(code);
}

export function openBundleApp(
  bundlePath: string,
  profileDir: string,
): void {
  const proc = Bun.spawn(
    ["open", "-n", bundlePath, "--args", `--user-data-dir=${profileDir}`],
    { stdout: "ignore", stderr: "ignore" },
  );
  proc.unref();
}

export function openDesktopApp(
  appName: string,
  profileDir: string,
): void {
  const proc = Bun.spawn(
    ["open", "-n", "-a", appName, "--args", `--user-data-dir=${profileDir}`],
    { stdout: "ignore", stderr: "ignore" },
  );
  proc.unref();
}

export function launchCodexDesktop(
  binaryPath: string,
  profileDir: string,
): void {
  const proc = Bun.spawn([binaryPath], {
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
    env: { ...process.env, CODEX_HOME: profileDir },
  });
  proc.unref();
}

export async function interactiveShell(
  env: Record<string, string>,
): Promise<number> {
  const shell = process.env.SHELL ?? "/bin/zsh";
  const proc = Bun.spawn([shell], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, ...env },
  });
  return proc.exited;
}
