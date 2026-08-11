import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await rm(path.join(extensionRoot, "dist"), { recursive: true, force: true });
