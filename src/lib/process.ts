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
  executable: string,
  env?: Record<string, string>,
): void {
  // Spawn the bundle's own binary directly rather than going through
  // `open -n`, which routes through Launch Services and can trigger
  // "app canonicalization" — macOS redirecting to the registered canonical
  // app for that executable, causing the original app to open instead.
  // Running the binary directly lets macOS associate the process with OUR
  // bundle (determined by walking up from the binary path) without any
  // Launch Services lookup.
  const binaryPath = `${bundlePath}/Contents/MacOS/${executable}`;
  const spawnEnv = env ? { ...process.env, ...env } : process.env;
  const args = env ? [binaryPath] : [binaryPath, `--user-data-dir=${profileDir}`];
  const proc = Bun.spawn(args, {
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
    env: spawnEnv as Record<string, string>,
  });
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
