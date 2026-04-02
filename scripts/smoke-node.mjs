import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "agp-smoke-"));

try {
  const versionOutput = execFileSync(
    process.execPath,
    ["./bin/agp.js", "--version"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  if (!versionOutput.includes("agp")) {
    throw new Error("Version output did not include agp.");
  }

  execFileSync(
    process.execPath,
    ["./bin/agp.js", "create", "smoke-profile", "--desc", "Smoke test"],
    {
      cwd: process.cwd(),
      env: { ...process.env, AGP_PROFILES_DIR: tempDir },
      stdio: "pipe",
    },
  );

  const listResult = spawnSync(process.execPath, ["./bin/agp.js", "list"], {
    cwd: process.cwd(),
    env: { ...process.env, AGP_PROFILES_DIR: tempDir },
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  const listOutput = `${listResult.stdout}${listResult.stderr}`;

  if (!listOutput.includes("smoke-profile")) {
    throw new Error("Smoke profile was not listed by the built CLI.");
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
