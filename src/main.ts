import { AGP_VERSION } from "./lib/config";
import { RED, RESET } from "./ui/colors";
import { AgpError } from "./ui/output";
import { usageMain } from "./commands/help";
import { cmdCreate } from "./commands/create";
import { cmdList } from "./commands/list";
import { cmdDelete } from "./commands/delete";
import { cmdOpen } from "./commands/open";
import { cmdShell } from "./commands/shell";
import { cmdEnv } from "./commands/env";
import { cmdUsage } from "./commands/usage";
import { cmdInstall } from "./commands/install";

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd) {
    usageMain();
    process.exit(0);
  }

  switch (cmd) {
    case "create":
      return cmdCreate(args);
    case "list":
    case "ls":
      return cmdList(args);
    case "delete":
    case "rm":
      return cmdDelete(args);
    case "open":
      return cmdOpen(args);
    case "shell":
      return cmdShell(args);
    case "env":
      return cmdEnv(args);
    case "usage":
      return cmdUsage(args);
    case "install":
      return cmdInstall(args);
    case "-h":
    case "--help":
    case "help":
      usageMain();
      return;
    case "-v":
    case "--version":
      console.log(`agp ${AGP_VERSION}`);
      return;
    default:
      console.error(
        `${RED} error${RESET}  Unknown command: ${cmd}. Run 'agp --help' for usage.`,
      );
      process.exit(1);
  }
}

main().catch((e) => {
  if (e instanceof AgpError) {
    console.error(`${RED} error${RESET}  ${e.message}`);
    process.exit(1);
  }
  throw e;
});
