import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const npmCache = mkdtempSync(join(tmpdir(), "agp-npm-cache-"));
const output = execFileSync("npm", ["pack", "--dry-run", "--ignore-scripts"], {
  encoding: "utf8",
  env: {
    ...process.env,
    npm_config_cache: npmCache,
  },
});

const blockedPatterns = [
  ".claude/",
  "tests/",
  "src/",
  "install.sh",
  "dist/agp",
  "\nagp\n",
  "\tagp\n",
  "\nagp\r\n",
];

for (const pattern of blockedPatterns) {
  if (output.includes(pattern)) {
    console.error(
      `npm pack would include forbidden content matching: ${pattern}`,
    );
    process.exit(1);
  }
}

process.stdout.write(output);
