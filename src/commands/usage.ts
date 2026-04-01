import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PROFILES_DIR } from "../lib/config";
import { listProfileDirs } from "../lib/fs";
import { dirExists, profilePath } from "../models/profile";
import { BOLD, CYAN, DIM, GREEN, MAGENTA, RESET, WHITE } from "../ui/colors";
import { error, info } from "../ui/output";

async function countClaudeSessions(profileDir: string): Promise<number> {
  const sessionDir = join(profileDir, "claude", "claude-code-sessions");
  if (!existsSync(sessionDir)) return 0;
  try {
    const entries = await readdir(sessionDir);
    return entries.filter((e) => e.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

async function getLastActivity(profileDir: string): Promise<string> {
  const sessionDir = join(profileDir, "claude", "claude-code-sessions");
  if (!existsSync(sessionDir)) return "never";
  try {
    const entries = await readdir(sessionDir);
    const jsonFiles = entries.filter((e) => e.endsWith(".json"));
    if (jsonFiles.length === 0) return "never";

    let latest = 0;
    for (const f of jsonFiles) {
      const s = await stat(join(sessionDir, f));
      if (s.mtimeMs > latest) latest = s.mtimeMs;
    }
    return new Date(latest).toLocaleString();
  } catch {
    return "never";
  }
}

async function countCompletedTurns(profileDir: string): Promise<number> {
  const sessionDir = join(profileDir, "claude", "claude-code-sessions");
  if (!existsSync(sessionDir)) return 0;
  let total = 0;
  try {
    const entries = await readdir(sessionDir);
    for (const f of entries.filter((e) => e.endsWith(".json"))) {
      try {
        const data = await Bun.file(join(sessionDir, f)).json();
        const turns = data?.completedTurns ?? 0;
        if (typeof turns === "number") total += turns;
      } catch {
        // skip malformed files
      }
    }
  } catch {
    // skip inaccessible dirs
  }
  return total;
}

async function getSessionTitle(sessionFile: string): Promise<string> {
  try {
    const data = await Bun.file(sessionFile).json();
    return data?.title ?? "Untitled";
  } catch {
    return "Untitled";
  }
}

export async function cmdUsage(args: string[]): Promise<void> {
  let profileName = "";
  let _showDetail = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--detail" || arg === "-d") {
      _showDetail = true;
    } else if (arg === "--help" || arg === "-h") {
      (await import("./help")).usageUsage();
      return;
    } else if (arg.startsWith("-")) {
      error(`Unknown option: ${arg}`);
    } else {
      profileName = arg;
    }
  }

  const names = await listProfileDirs(PROFILES_DIR);
  if (names.length === 0) {
    info("No profiles found.");
    return;
  }

  // Detail view for a specific profile
  if (profileName) {
    if (!(await dirExists(profileName))) {
      error(`Profile '${profileName}' not found.`);
    }

    const p = profilePath(profileName);
    const sessions = await countClaudeSessions(p);
    const lastActivity = await getLastActivity(p);
    const turns = await countCompletedTurns(p);

    console.error(`\n${BOLD}${CYAN}Profile: ${profileName}${RESET}`);
    console.error(`${DIM}────────────────────────────────────${RESET}`);
    console.error(`  Claude Code Sessions:   ${GREEN}${sessions}${RESET}`);
    console.error(`  Completed Interactions: ${MAGENTA}${turns}${RESET}`);
    console.error(`  Last Activity:          ${DIM}${lastActivity}${RESET}`);

    if (sessions > 0) {
      const sessionDir = join(p, "claude", "claude-code-sessions");
      const entries = await readdir(sessionDir);
      const jsonFiles = entries
        .filter((e) => e.endsWith(".json"))
        .sort()
        .reverse()
        .slice(0, 5);

      console.error(`\n  ${BOLD}Recent Sessions:${RESET}`);
      for (const f of jsonFiles) {
        const filePath = join(sessionDir, f);
        const title = await getSessionTitle(filePath);
        let turnsInSession = 0;
        try {
          const data = await Bun.file(filePath).json();
          turnsInSession = data?.completedTurns ?? 0;
        } catch {
          // skip
        }
        const truncTitle = title.length > 35 ? title.slice(0, 35) + "..." : title + "...";
        console.error(
          `    • ${truncTitle.padEnd(40)} (${CYAN}${turnsInSession} interactions${RESET})`,
        );
      }
    }
    console.error("");
    return;
  }

  // Summary for all profiles
  const nameW = 18;
  console.error(
    `\n${BOLD}${WHITE}${"PROFILE".padEnd(nameW)}  ${"USAGE".padEnd(10)}  ${"LAST ACTIVITY".padEnd(16)}  ${"SESSIONS".padEnd(12)}${RESET}`,
  );
  console.error(`${DIM}${"─".repeat(70)}${RESET}`);

  let totalSessions = 0;
  let totalTurns = 0;

  for (const name of names) {
    const p = profilePath(name);
    const sessions = await countClaudeSessions(p);
    const lastActivity = await getLastActivity(p);
    const turns = await countCompletedTurns(p);

    totalSessions += sessions;
    totalTurns += turns;

    console.error(
      `  ${name.padEnd(nameW - 2)}  ${MAGENTA}${String(turns).padEnd(9)}${RESET}  ${DIM}${lastActivity.padEnd(15)}${RESET}  ${CYAN}${sessions}${RESET}`,
    );
  }

  console.error(`\n${BOLD}SUMMARY${RESET}`);
  console.error(`${DIM}────────────────────────────────────${RESET}`);
  console.error(`  Total Claude Code Sessions: ${CYAN}${totalSessions}${RESET}`);
  console.error(`  Total Interactions (Usage): ${MAGENTA}${totalTurns}${RESET}`);
  console.error("");
}
