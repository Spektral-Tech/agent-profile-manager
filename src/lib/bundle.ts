/**
 * Bundle generation — wrapper approach.
 *
 * Instead of copying the original app (which breaks Electron's integrity
 * check via `codesign --deep`), we scaffold a minimal wrapper .app:
 *
 *   ~/Applications/AGP/<profile>/<AppName>.app/
 *   ├── Contents/
 *   │   ├── Info.plist          (unique bundle ID + display name)
 *   │   ├── PkgInfo             (APPL????)
 *   │   ├── MacOS/
 *   │   │   └── launcher        (shell script — opens the real app)
 *   │   └── Resources/
 *   │       └── icon.icns       (tinted copy of the original icon)
 *
 * The wrapper is ad-hoc signed (no --deep, no nested code objects to worry
 * about). The original app is never touched.
 */

import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, rm, unlink, cp, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { BUNDLES_DIR, PROFILES_DIR } from "./config";
import { ensureDir } from "./fs";
import type { Profile } from "../models/profile";
import type { ToolDef } from "../models/tools";
import { info, warn } from "../ui/output";

// ─── Paths ────────────────────────────────────────────────────────────────────

export function bundlePath(profileName: string, appName: string): string {
  return join(BUNDLES_DIR, profileName, `${appName}.app`);
}

export function bundleExists(profileName: string, appName: string): boolean {
  return existsSync(bundlePath(profileName, appName));
}

// ─── Shell helpers ────────────────────────────────────────────────────────────

async function run(
  cmd: string,
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn([cmd, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const code = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  return { code, stdout, stderr };
}

// ─── Plist helper ─────────────────────────────────────────────────────────────

async function plistGet(plistPath: string, key: string): Promise<string> {
  const { code, stdout } = await run("plutil", [
    "-extract", key, "raw", "-o", "-", plistPath,
  ]);
  if (code !== 0) return "";
  return stdout.trim();
}

// ─── Icon tinting ─────────────────────────────────────────────────────────────

// Swift script for per-PNG tinting via AppKit.
// Compiled once per bundle generation, then run once per PNG in the iconset.
const TINT_SCRIPT = `
import AppKit

let args = CommandLine.arguments
guard args.count == 4 else {
    fputs("usage: tint <src.png> <dst.png> <#hex>\\n", stderr)
    exit(1)
}

var hex = args[3]
if hex.hasPrefix("#") { hex = String(hex.dropFirst()) }

guard hex.count == 6,
      let rv = UInt8(hex.prefix(2), radix: 16),
      let gv = UInt8(hex.dropFirst(2).prefix(2), radix: 16),
      let bv = UInt8(hex.dropFirst(4).prefix(2), radix: 16) else {
    fputs("invalid color: \\(args[3])\\n", stderr)
    exit(1)
}

let r = CGFloat(rv) / 255.0
let g = CGFloat(gv) / 255.0
let b = CGFloat(bv) / 255.0

guard let srcImage = NSImage(contentsOfFile: args[1]) else {
    fputs("cannot load: \\(args[1])\\n", stderr)
    exit(1)
}

let size = srcImage.size
let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(size.width),
    pixelsHigh: Int(size.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
)!
let ctx = NSGraphicsContext(bitmapImageRep: rep)!

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = ctx

srcImage.draw(in: NSRect(origin: .zero, size: size),
              from: .zero,
              operation: .copy,
              fraction: 1.0)

// sourceAtop: tint color clipped to original icon alpha, preserving shape
ctx.cgContext.setBlendMode(.sourceAtop)
NSColor(red: r, green: g, blue: b, alpha: 0.65).setFill()
NSBezierPath(rect: NSRect(origin: .zero, size: size)).fill()

NSGraphicsContext.restoreGraphicsState()

guard let pngData = rep.representation(using: .png, properties: [:]) else {
    fputs("cannot encode PNG\\n", stderr)
    exit(1)
}

do {
    try pngData.write(to: URL(fileURLWithPath: args[2]))
} catch {
    fputs("cannot write \\(args[2]): \\(error)\\n", stderr)
    exit(1)
}
`;

/** Compile the tint script once, return path to binary + cleanup fn. */
async function compileTintBinary(): Promise<{ binPath: string; cleanup: () => Promise<void> }> {
  const tmpDir = await mkdtemp(join(tmpdir(), "agp-tint-"));
  const srcFile = join(tmpDir, "tint.swift");
  const binFile = join(tmpDir, "tint");
  await Bun.write(srcFile, TINT_SCRIPT);
  const { code, stderr } = await run("swiftc", ["-o", binFile, srcFile]);
  if (code !== 0) {
    await rm(tmpDir, { recursive: true, force: true });
    throw new Error(`swiftc compilation failed: ${stderr.trim()}`);
  }
  return {
    binPath: binFile,
    cleanup: () => rm(tmpDir, { recursive: true, force: true }),
  };
}

/**
 * Tint all PNGs in an iconset using a pre-compiled binary.
 * srcIcnsPath: original .icns (read-only)
 * dstIcnsPath: output .icns (written)
 * hexColor: e.g. "#0066CC"
 */
async function tintIcon(
  srcIcnsPath: string,
  dstIcnsPath: string,
  hexColor: string,
): Promise<void> {
  const tmpDir = await mkdtemp(join(tmpdir(), "agp-iconset-"));
  const iconsetPath = join(tmpDir, "icon.iconset");

  info("Compiling icon tint tool...");
  const { binPath, cleanup } = await compileTintBinary();

  try {
    const unpack = await run("iconutil", ["-c", "iconset", "-o", iconsetPath, srcIcnsPath]);
    if (unpack.code !== 0) throw new Error(`iconutil unpack: ${unpack.stderr.trim()}`);

    const pngs = (await readdir(iconsetPath)).filter((f) => f.endsWith(".png"));
    info(`Tinting ${pngs.length} icon sizes...`);
    for (const png of pngs) {
      const pngPath = join(iconsetPath, png);
      const { code, stderr } = await run(binPath, [pngPath, pngPath, hexColor]);
      if (code !== 0) warn(`tint ${png}: ${stderr.trim()}`);
    }

    const repack = await run("iconutil", ["-c", "icns", "-o", dstIcnsPath, iconsetPath]);
    if (repack.code !== 0) throw new Error(`iconutil repack: ${repack.stderr.trim()}`);
  } finally {
    await cleanup();
    await rm(tmpDir, { recursive: true, force: true });
  }
}

// ─── Info.plist template ──────────────────────────────────────────────────────

function buildInfoPlist(bundleId: string, displayName: string): string {
  // Escape XML special chars in display name
  const safe = displayName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDisplayName</key>
\t<string>${safe}</string>
\t<key>CFBundleExecutable</key>
\t<string>launcher</string>
\t<key>CFBundleIconFile</key>
\t<string>icon</string>
\t<key>CFBundleIdentifier</key>
\t<string>${bundleId}</string>
\t<key>CFBundleName</key>
\t<string>${safe}</string>
\t<key>CFBundlePackageType</key>
\t<string>APPL</string>
\t<key>CFBundleShortVersionString</key>
\t<string>1.0</string>
\t<key>CFBundleVersion</key>
\t<string>1</string>
\t<key>NSHighResolutionCapable</key>
\t<true/>
</dict>
</plist>
`;
}

// ─── Launcher script ──────────────────────────────────────────────────────────

/**
 * Build a shell script that opens the original app with the right profile dir.
 * The profile data dir is baked in at generation time so the script works when
 * launched from the Dock (where shell env vars are not inherited).
 */
function buildLauncherScript(def: ToolDef, profile: Profile): string {
  const profileDataDir = join(PROFILES_DIR, profile.name, def.subdir);

  if (def.name === "codex-desktop") {
    // Codex uses CODEX_HOME env var; needs direct binary launch
    return `#!/bin/bash
_CODEX=""
[ -d "/Applications/Codex.app" ] && _CODEX="/Applications/Codex.app"
[ -d "$HOME/Applications/Codex.app" ] && _CODEX="$HOME/Applications/Codex.app"
if [ -n "$_CODEX" ]; then
    exec env CODEX_HOME=${JSON.stringify(profileDataDir)} "$_CODEX/Contents/MacOS/Codex"
fi
`;
  }

  // All other desktop tools accept --user-data-dir via open(1)
  return `#!/bin/bash
exec open -n -a ${JSON.stringify(def.appName!)} --args --user-data-dir=${JSON.stringify(profileDataDir)}
`;
}

// ─── Public: generate wrapper bundle ─────────────────────────────────────────

export interface BundleOptions {
  force?: boolean;
}

export async function generateBundle(
  profile: Profile,
  def: ToolDef,
  srcAppPath: string,
  opts: BundleOptions = {},
): Promise<string> {
  const appName = def.appName!;
  const dest = bundlePath(profile.name, appName);

  if (existsSync(dest)) {
    if (!opts.force) {
      throw new Error(`Bundle already exists: ${dest}\nUse --force to overwrite.`);
    }
    await rm(dest, { recursive: true, force: true });
  }

  // Scaffold wrapper bundle structure
  const contentsDir = join(dest, "Contents");
  const macosDir = join(contentsDir, "MacOS");
  const resourcesDir = join(contentsDir, "Resources");
  await ensureDir(macosDir);
  await ensureDir(resourcesDir);

  // PkgInfo (required by the bundle spec)
  await Bun.write(join(contentsDir, "PkgInfo"), "APPL????");

  // Info.plist
  const displayName = profile.branding?.display_name ?? `${appName} · ${profile.name}`;
  const bundleId = `com.agp.${profile.name}.${def.name}`;
  await Bun.write(join(contentsDir, "Info.plist"), buildInfoPlist(bundleId, displayName));

  // Icon: extract from source app, optionally tint
  const srcPlist = join(srcAppPath, "Contents", "Info.plist");
  const iconFile = await plistGet(srcPlist, "CFBundleIconFile");
  const iconDest = join(resourcesDir, "icon.icns");

  if (iconFile) {
    const icnsName = iconFile.endsWith(".icns") ? iconFile : `${iconFile}.icns`;
    const srcIcnsPath = join(srcAppPath, "Contents", "Resources", icnsName);

    if (existsSync(srcIcnsPath)) {
      const { icon_color, icon_mode } = profile.branding ?? {};
      if (icon_color && icon_mode !== "none") {
        await tintIcon(srcIcnsPath, iconDest, icon_color);
      } else {
        await cp(srcIcnsPath, iconDest);
      }
    } else {
      warn(`Icon file not found at ${srcIcnsPath} — bundle will have no icon`);
    }
  }

  // Launcher shell script
  const launcherPath = join(macosDir, "launcher");
  await Bun.write(launcherPath, buildLauncherScript(def, profile));
  await chmod(launcherPath, 0o755);

  // Ad-hoc sign (wrapper only — no nested code objects, no --deep needed)
  const sign = await run("codesign", ["--force", "--sign", "-", dest]);
  if (sign.code !== 0) warn(`codesign: ${sign.stderr.trim()}`);

  return dest;
}
