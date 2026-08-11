# SchemaPad VS Code extension security

SchemaPad is packaged as a VS Code browser/worker extension. Its runtime has no Node.js
`fs` module and no `process.env` access. The extension only accepts document URIs ending
in `.prisma`, and it reads and updates those documents through VS Code's text-document
and workspace-edit APIs.

The editor webview can load only packaged extension assets. Its Content Security Policy
sets `connect-src 'none'`, so canvas code cannot directly make HTTP, WebSocket, or other
network connections. The runtime does not scan for `.env` files, call `workspace.fs`, or
resolve values referenced by Prisma `env("NAME")` expressions.

When the user explicitly uses the AI feature, a narrow host bridge sends the AI request
only to `https://schemapad.dev/api/chat`. The request includes the prompt, relevant schema
context, selected model/provider configuration, and the API key entered in SchemaPad's AI
settings. The build fails if another host fetch target is introduced. AI configuration is
stored in the isolated extension-webview storage and is never read from environment files.

The build runs a static security check which fails if filesystem or environment-variable
APIs, direct webview networking, or a non-SchemaPad host fetch target are introduced.

## Trust boundary

VS Code does not provide per-file operating-system permissions for extensions. A future
malicious or compromised release could request VS Code APIs that this release does not
use. Install only packages published by the expected SchemaPad publisher, review update
provenance, and use VS Code Restricted Mode for repositories you do not trust. SchemaPad
is deliberately disabled in Restricted Mode.
