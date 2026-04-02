import { execFileSync } from "node:child_process";
import { chmod, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(root, "dist");
const binPath = join(root, "bin", "agp.js");

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

execFileSync(
  "bun",
  ["build", "--target=node", "--outfile=dist/main.js", "src/main.ts"],
  {
    cwd: root,
    stdio: "inherit",
  },
);

await chmod(binPath, 0o755);
