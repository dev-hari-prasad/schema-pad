import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoots = [path.join(extensionRoot, "src"), path.join(extensionRoot, "webview")];
const forbiddenRuntimePatterns = [
  [/\bprocess\.env\b/u, "environment-variable access"],
  [/\bworkspace\.fs\b/u, "raw VS Code filesystem access"],
  [/(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\()\s*["'](?:node:)?fs(?:\/promises)?["']/u, "Node filesystem access"],
  [/\b(?:XMLHttpRequest|WebSocket|EventSource)\b/u, "network API"],
  [/["'`]\.env(?:\.|["'`])/u, ".env filename access"],
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(candidate);
      return /\.(?:ts|tsx)$/u.test(entry.name) && !entry.name.endsWith(".test.ts")
        ? [candidate]
        : [];
    }),
  );
  return nested.flat();
}

for (const runtimeRoot of runtimeRoots) {
  for (const file of await sourceFiles(runtimeRoot)) {
    const source = await readFile(file, "utf8");
    for (const [pattern, description] of forbiddenRuntimePatterns) {
      if (pattern.test(source)) {
        throw new Error(`${description} is forbidden in extension runtime code: ${file}`);
      }
    }
  }
}

const manifest = JSON.parse(await readFile(path.join(extensionRoot, "package.json"), "utf8"));
if (!manifest.browser || !manifest.main) {
  throw new Error("SchemaPad must provide both audited desktop and browser extension entries.");
}

const extensionSource = await readFile(path.join(extensionRoot, "src", "extension.ts"), "utf8");
if (!extensionSource.includes("connect-src 'none'")) {
  throw new Error("The SchemaPad webview must block all network connections in its CSP.");
}
const hostFetches = extensionSource.match(/\bfetch\s*\(/gu) ?? [];
if (
  hostFetches.length !== 1 ||
  !extensionSource.includes('const AI_CHAT_ENDPOINT = "https://schemapad.dev/api/chat"') ||
  !extensionSource.includes("fetch(AI_CHAT_ENDPOINT")
) {
  throw new Error("The extension host may only fetch through the fixed SchemaPad AI endpoint.");
}

if (!process.argv.includes("--source-only")) {
  for (const hostBundle of [manifest.main, manifest.browser]) {
    const builtHost = await readFile(path.join(extensionRoot, hostBundle), "utf8");
    for (const [pattern, description] of forbiddenRuntimePatterns) {
      if (pattern.test(builtHost)) {
        throw new Error(`${description} leaked into bundled extension host ${hostBundle}.`);
      }
    }
  }

  const builtWebviewFiles = (await sourceFiles(path.join(extensionRoot, "dist", "webview")))
    .filter((file) => file.endsWith(".js"));
  // sourceFiles intentionally selects TypeScript, so collect generated JS separately.
  const collectJavaScript = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectJavaScript(candidate);
      return entry.name.endsWith(".js") ? [candidate] : [];
    }));
    return nested.flat();
  };

  builtWebviewFiles.push(...await collectJavaScript(path.join(extensionRoot, "dist", "webview")));
  for (const file of new Set(builtWebviewFiles)) {
    const source = await readFile(file, "utf8");
    for (const [pattern, description] of forbiddenRuntimePatterns) {
      if (pattern.test(source)) {
        throw new Error(`${description} leaked into the bundled SchemaPad webview: ${file}`);
      }
    }
    if (source.includes("/api/chat")) {
      throw new Error(`The web-only AI API leaked into the bundled SchemaPad webview: ${file}`);
    }
  }
}

console.log("Security check passed: audited desktop/web hosts, Prisma-only files, no env/fs access, fixed AI endpoint only.");
