import { dirname, resolve } from "node:path";
import { symlink, mkdir } from "node:fs/promises";
import { existsSync, unlinkSync } from "node:fs";
import { dim, success } from "../ui/output";

export async function cmdInstall(_args: string[]): Promise<void> {
  const scriptPath = resolve(process.argv[1] ?? Bun.main);
  const target = `${process.env.HOME}/.local/bin/agp`;
  const targetDir = dirname(target);

  await mkdir(targetDir, { recursive: true });

  if (existsSync(target)) {
    unlinkSync(target);
  }

  await symlink(scriptPath, target);
  success(`Installed: ${target} -> ${scriptPath}`);
  dim(`  Make sure ${process.env.HOME}/.local/bin is in your PATH.`);
}
