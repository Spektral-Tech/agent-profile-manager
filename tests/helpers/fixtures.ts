import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resetConfig } from "../../src/lib/agpConfig";

export async function withTempProfiles(
  fn: (dir: string) => Promise<void>,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "agp-test-"));
  const original = process.env.AGP_PROFILES_DIR;
  try {
    process.env.AGP_PROFILES_DIR = dir;
    resetConfig();
    await fn(dir);
  } finally {
    process.env.AGP_PROFILES_DIR = original;
    resetConfig();
    await rm(dir, { recursive: true, force: true });
  }
}
