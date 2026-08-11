import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(extensionRoot, "..");
const sourceLogo = path.join(repositoryRoot, "public", "logo.svg");
const sourceIconPng = path.join(repositoryRoot, "public", "Icon.png");
const mediaDirectory = path.join(extensionRoot, "media");
const sharedAssetsDirectory = path.join(repositoryRoot, "src", "assets");
const activityIcon = path.join(mediaDirectory, "schemapad-activity.svg");

const logo = await readFile(sourceLogo, "utf8");
const logoPath = /<path\s+fill="#f43f01"\s+d="([^"]+)"/iu.exec(logo)?.[1];
if (!logoPath) throw new Error("Could not extract the SchemaPad path from public/logo.svg");
const monochromeLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1172.25 1172.25"><path fill="currentColor" d="${logoPath}"/></svg>\n`;

await mkdir(mediaDirectory, { recursive: true });
await mkdir(sharedAssetsDirectory, { recursive: true });
await writeFile(activityIcon, monochromeLogo, "utf8");
await copyFile(sourceIconPng, path.join(sharedAssetsDirectory, "Icon.png"));
