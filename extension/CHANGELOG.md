# Changelog

## 0.2.3

- Fixed extension webview asset resolution for logo images.
- Enhanced onboarding experience with bullet points, smooth step positioning, dynamic height calculation, and action CTAs.
- Added empty canvas branding and keyboard shortcut hints.
- Bumped extension version to `0.2.3`.

## 0.2.2

- Repositioned the Marketplace overview around Schema Pad's complete visual database
  design workflow instead of presenting it primarily as a Prisma editor.
- Highlighted ERD modeling, AI assistance, Drizzle ORM generation, PostgreSQL and MySQL
  SQL generation, and team use cases alongside Prisma synchronization.
- Updated the Marketplace summary and bumped both the web app and extension to `0.2.2`.

## 0.2.1

- Rewrote the Marketplace overview as concise product copy for developers and
  technical teams.
- Removed local setup, build, installation, publishing, and implementation details
  from the Marketplace overview.
- Updated the Marketplace description and expanded discovery tags for Drizzle, ORM,
  SQL, PostgreSQL, MySQL, database design, data modeling, developer tools, and AI.
- Moved generated VSIX packages into `extension/build/` and updated CI artifact
  collection to match.
- Made packaging automatically remove superseded VSIX files from the build folder.
- Updated both the Schema Pad web app and VS Code extension to version `0.2.1`.

## 0.2.0

- Changed the Marketplace display name to **Schema Pad**.
- Matched the extension manifest to the `DevHariPrasad` Marketplace publisher.
- Added release tag/version validation and explicit Marketplace credential checks.
- Updated the main application and extension to the same `0.2.0` release version.

## 0.1.9

- Collapsed successful sync feedback to a hover-expandable status dot and briefly
  auto-expanded errors before returning them to the compact state.
- Used smaller Manrope onboarding-guide text in extension mode without changing the web UI.
- Made the slash command center available through capture-level keyboard handling and
  the visible Commands shortcut.
- Deferred Prisma writes while table or field names are actively edited, preventing
  temporary duplicate models and canvas position flicker.
- Added Codicons to both primary-sidebar actions.

## 0.1.8

- Renamed the compact sync action to **Open contract beside**.
- Added live VS Code editor-layout detection and hide the action whenever the same
  Prisma contract is already visible beside SchemaPad.

## 0.1.7

- Closed the primary sidebar after launching split view.
- Replaced cramped sidebar rows with native VS Code welcome actions and descriptions.
- Preserved inline table and field editing focus during two-way sync acknowledgements.
- Centered the slash-command palette in the viewport so it remains usable in compact panes.
- Hid successful sync status earlier in narrow panes while keeping saving and error feedback.
- Generated numbered, collision-free names when duplicating tables.

## 0.1.6

- Added an audited desktop extension-host entry so native sidebar actions register in
  desktop VS Code instead of leaving the view without a data provider.
- Kept a separate browser extension bundle for VS Code web compatibility.
- Extended the security gate to reject filesystem, `.env`, and environment-variable
  access in both host bundles.

## 0.1.5

- Assigned a new native Tree View ID so VS Code cannot reuse the cached webview
  descriptor from earlier extension versions.

## 0.1.4

- Replaced the primary-sidebar webview with an instant native VS Code Tree View.
- Rendered Open SchemaPad and Split View as native workbench command rows so the full
  SchemaPad bundle is loaded only after an editor action is selected.

## 0.1.3

- Moved Open SchemaPad and Split View into the primary sidebar itself.
- Kept launch actions in the main editor area instead of opening a sidebar-sized editor.
- Added the official SchemaPad icon to custom-editor tabs and refreshed the Activity Bar
  container identity to prevent VS Code from reusing the previous generic cached icon.

## 0.1.2

- Restored the complete AI chat and agent interface in the VS Code extension.
- Added a streaming bridge to the fixed SchemaPad AI endpoint without enabling direct
  webview networking or environment-file access.
- Added responsive control priorities for narrow editor groups: secondary top controls
  and zoom hide first, history stays left, AI input contracts, then sync status hides.

## 0.1.1

- Simplified the launcher to two equally styled actions with clearer descriptions.
- Made Split View place the Prisma contract on the left and SchemaPad on the right.
- Rebuilt the Activity Bar icon from the official SchemaPad SVG as a theme-aware icon.

## 0.1.0

- Added a native SchemaPad custom editor for Prisma files.
- Added conflict-safe two-way synchronization with VS Code text documents.
- Reused the web application's canvas directly without an iframe or duplicated UI implementation.
- Added production bundling, local F5 launch configuration, tests, and VSIX packaging.
- Added an optional native VS Code recommendation when opening `contract.prisma`.
- Changed the Activity Bar entry to open a lightweight launcher page with current-group and split-view actions.
- Moved sync feedback to bottom-center and simplified Prisma syntax errors.
- Added serialized, request-ID-based synchronization so rapid canvas changes are queued
  until VS Code acknowledges the exact document revision.
- Converted the host to a browser/worker extension, restricted it to `.prisma` documents,
  blocked webview networking, and added a build-time filesystem/env/network security gate.
