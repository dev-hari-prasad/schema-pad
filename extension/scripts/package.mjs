import { mkdir, readFile, readdir, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(extensionRoot, "package.json"), "utf8"));
const buildDirectory = path.join(extensionRoot, "build");
const outputName = `${manifest.name}-${manifest.version}.vsix`;
const outputPath = path.join(buildDirectory, outputName);
const vscePath = path.join(extensionRoot, "node_modules", "@vscode", "vsce", "vsce");

await mkdir(buildDirectory, { recursive: true });

const result = spawnSync(
  process.execPath,
  [vscePath, "package", "--no-dependencies", "--out", outputPath],
  { cwd: extensionRoot, stdio: "inherit" },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

for (const entry of await readdir(buildDirectory, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".vsix") && entry.name !== outputName) {
    await unlink(path.join(buildDirectory, entry.name));
  }
}

console.log(`Current extension package: ${path.relative(extensionRoot, outputPath)}`);
