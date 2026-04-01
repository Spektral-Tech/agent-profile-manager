import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function withTempProfiles(
  fn: (dir: string) => Promise<void>,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "agp-test-"));
  const original = process.env.AGP_PROFILES_DIR;
  try {
    process.env.AGP_PROFILES_DIR = dir;
    await fn(dir);
  } finally {
    process.env.AGP_PROFILES_DIR = original;
    await rm(dir, { recursive: true, force: true });
  }
}
