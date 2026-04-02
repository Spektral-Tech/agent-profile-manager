/**
 * Bundle generation — shallow clone approach.
 *
 * We copy the original app with `ditto`, patch only the outer Info.plist,
 * tint the icon in the clone's Resources/, then re-sign ONLY the outer
 * bundle (no --deep). Inner frameworks (Electron Framework, Squirrel, etc.)
 * keep their original Anthropic signatures and pass Electron's startup check.
 *
 *   ~/Applications/AGP/<profile>/<AppName>.app/
 *   ├── Contents/
 *   │   ├── Info.plist      ← patched: bundle ID, display name
 *   │   ├── MacOS/Claude    ← original binary (untouched)
 *   │   ├── Frameworks/     ← untouched (keeps Anthropic signatures)
 *   │   └── Resources/
 *   │       └── electron.icns  ← tinted copy
 *
 * codesign --force --sign - <bundle>  (no --deep)
 *   → replaces outer _CodeSignature to match the new Info.plist
 *   → inner framework signatures are NOT touched
 */

import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, rm, unlink, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { BUNDLES_DIR } from "./config";
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

// ─── Plist helpers ────────────────────────────────────────────────────────────

async function plistGet(plistPath: string, key: string): Promise<string> {
  const { code, stdout } = await run("plutil", [
    "-extract", key, "raw", "-o", "-", plistPath,
  ]);
  if (code !== 0) return "";
  return stdout.trim();
}

async function plistSet(plistPath: string, key: string, value: string): Promise<void> {
  const { code, stderr } = await run("plutil", [
    "-replace", key, "-string", value, plistPath,
  ]);
  if (code !== 0) throw new Error(`plutil -replace ${key}: ${stderr.trim()}`);
}

// ─── Icon tinting ─────────────────────────────────────────────────────────────

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

// sourceAtop: tint color clipped to the icon's alpha channel
ctx.cgContext.setBlendMode(.sourceAtop)
NSColor(red: r, green: g, blue: b, alpha: 0.6).setFill()
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

async function compileTintBinary(tmpDir: string): Promise<string> {
  const srcFile = join(tmpDir, "tint.swift");
  const binFile = join(tmpDir, "tint");
  await Bun.write(srcFile, TINT_SCRIPT);
  const { code, stderr } = await run("swiftc", ["-o", binFile, srcFile]);
  if (code !== 0) throw new Error(`swiftc: ${stderr.trim()}`);
  return binFile;
}

/** Tint srcIcnsPath → dstIcnsPath with hexColor. Both can be the same path. */
async function tintIcon(
  srcIcnsPath: string,
  dstIcnsPath: string,
  hexColor: string,
): Promise<void> {
  const tmpDir = await mkdtemp(join(tmpdir(), "agp-tint-"));
  try {
    info("Compiling tint tool...");
    const binPath = await compileTintBinary(tmpDir);

    const iconsetPath = join(tmpDir, "icon.iconset");
    const unpack = await run("iconutil", ["-c", "iconset", "-o", iconsetPath, srcIcnsPath]);
    if (unpack.code !== 0) throw new Error(`iconutil unpack: ${unpack.stderr.trim()}`);

    const pngs = (await readdir(iconsetPath)).filter((f) => f.endsWith(".png"));
    if (pngs.length === 0) throw new Error("iconset is empty — no PNGs found");
    info(`Tinting ${pngs.length} icon sizes...`);

    for (const png of pngs) {
      const pngPath = join(iconsetPath, png);
      const { code, stderr } = await run(binPath, [pngPath, pngPath, hexColor]);
      if (code !== 0) throw new Error(`tint ${png}: ${stderr.trim()}`);
    }

    const outIcns = join(tmpDir, "out.icns");
    const repack = await run("iconutil", ["-c", "icns", "-o", outIcns, iconsetPath]);
    if (repack.code !== 0) throw new Error(`iconutil repack: ${repack.stderr.trim()}`);

    // Move to destination (overwrite if same path)
    await cp(outIcns, dstIcnsPath, { force: true });
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

// ─── Public: generate bundle ──────────────────────────────────────────────────

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
  const destDir = join(BUNDLES_DIR, profile.name);

  if (existsSync(dest)) {
    if (!opts.force) {
      throw new Error(`Bundle already exists: ${dest}\nUse --force to overwrite.`);
    }
    await rm(dest, { recursive: true, force: true });
  }

  await ensureDir(destDir);

  // 1. Copy original app — preserves all binaries, frameworks, signatures
  info(`Copying ${appName}.app...`);
  const copy = await run("ditto", [srcAppPath, dest]);
  if (copy.code !== 0) throw new Error(`ditto: ${copy.stderr.trim()}`);

  const plist = join(dest, "Contents", "Info.plist");

  // 2. Patch outer bundle identity only
  const displayName = profile.branding?.display_name ?? `${appName} · ${profile.name}`;
  const bundleId = `com.agp.${profile.name}.${def.name}`;

  await plistSet(plist, "CFBundleIdentifier", bundleId);
  await plistSet(plist, "CFBundleDisplayName", displayName);
  await plistSet(plist, "CFBundleName", displayName);

  // 3. Tint icon (if icon_color set and icon_mode is not "none")
  const { icon_color, icon_mode } = profile.branding ?? {};
  if (icon_color && icon_mode !== "none") {
    const iconFile = await plistGet(plist, "CFBundleIconFile");
    if (iconFile) {
      const icnsName = iconFile.endsWith(".icns") ? iconFile : `${iconFile}.icns`;
      const icnsPath = join(dest, "Contents", "Resources", icnsName);
      if (existsSync(icnsPath)) {
        try {
          await tintIcon(icnsPath, icnsPath, icon_color);
        } catch (e: unknown) {
          warn(`Icon tinting failed: ${e instanceof Error ? e.message : String(e)}`);
          warn("Bundle was created without icon tinting.");
        }
      } else {
        warn(`Icon file not found at ${icnsPath} — skipping tint`);
      }
    }
  }

  // 4. Re-sign ONLY the outer bundle (no --deep).
  //    This updates _CodeSignature to match the new Info.plist.
  //    Inner frameworks keep their original Anthropic signatures.
  info("Signing bundle...");
  const sign = await run("codesign", ["--force", "--sign", "-", dest]);
  if (sign.code !== 0) warn(`codesign: ${sign.stderr.trim()}`);

  // 5. Remove quarantine attribute (locally generated, not downloaded)
  await run("xattr", ["-dr", "com.apple.quarantine", dest]);

  return dest;
}
