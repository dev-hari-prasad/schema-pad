import * as vscode from "vscode";

const EDITOR_VIEW_TYPE = "schemaPad.prismaEditor";
const SIDEBAR_VIEW_TYPE = "schemaPad.nativeSidebarView";
const SIDEBAR_CONTAINER_ID = "schemapadPrimary";
const CONTRACT_RECOMMENDATION_DISABLED = "schemaPad.contractRecommendationDisabled";
const ONBOARDING_COMPLETED_KEY = "schemaPad.onboardingCompleted";
const AI_CHAT_ENDPOINT = "https://schemapad.dev/api/chat";
const MAX_AI_REQUEST_BYTES = 2_000_000;

type WebviewMessage =
  | { type: "ready" }
  | { type: "requestDocument" }
  | { type: "requestOnboardingState" }
  | { type: "setOnboardingCompleted"; completed?: boolean }
  | { type: "schemaChanged"; requestId: string; text: string; baseVersion: number }
  | { type: "aiRequest"; requestId: string; body: unknown }
  | { type: "aiAbort"; requestId: string }
  | { type: "openTextEditor" };

export function activate(context: vscode.ExtensionContext): void {
  const editorProvider = new SchemaPadEditorProvider(context);
  const sidebarProvider = new SchemaPadSidebarProvider();
  const promptedDocuments = new Set<string>();

  const recommendSchemaPad = async (document: vscode.TextDocument | undefined) => {
    if (!document || !isContractPrisma(document.uri)) return;
    if (context.globalState.get<boolean>(CONTRACT_RECOMMENDATION_DISABLED, false)) return;

    const documentKey = document.uri.toString();
    if (promptedDocuments.has(documentKey)) return;
    promptedDocuments.add(documentKey);

    const selection = await vscode.window.showInformationMessage(
      "Visualize and design database schemas with SchemaPad for VS Code.",
      "Open SchemaPad",
      "Don't show again",
    );

    if (selection === "Open SchemaPad") {
      await openPrismaEditor(document.uri);
    } else if (selection === "Don't show again") {
      await context.globalState.update(CONTRACT_RECOMMENDATION_DISABLED, true);
    }
  };

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(EDITOR_VIEW_TYPE, editorProvider, {
      supportsMultipleEditorsPerDocument: false,
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.window.registerTreeDataProvider(SIDEBAR_VIEW_TYPE, sidebarProvider),
    vscode.commands.registerCommand(
      "schemaPad.open",
      async (resource?: vscode.Uri) => openPrismaEditor(resource),
    ),
    vscode.commands.registerCommand(
      "schemaPad.openContract",
      async (resource?: vscode.Uri) => openPrismaEditor(resource),
    ),
    vscode.commands.registerCommand("schemaPad.openSplitView", openPrismaSplitView),
    vscode.commands.registerCommand("schemaPad.showCommandCenter", async () =>
      editorProvider.showCommandCenter()
    ),
    vscode.commands.registerCommand("schemaPad.resetOnboarding", async () => {
      await context.globalState.update(ONBOARDING_COMPLETED_KEY, false);
      editorProvider.resetOnboarding();
      void vscode.window.showInformationMessage("SchemaPad onboarding has been reset.");
    }),
    vscode.commands.registerCommand("schemaPad.openLauncher", () =>
      vscode.commands.executeCommand(`workbench.view.extension.${SIDEBAR_CONTAINER_ID}`)
    ),
    vscode.workspace.onDidOpenTextDocument((document) => {
      void recommendSchemaPad(document);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      void recommendSchemaPad(editor?.document);
    }),
  );

  void recommendSchemaPad(vscode.window.activeTextEditor?.document);
}

export function deactivate(): void {}

async function openPrismaEditor(
  resource?: vscode.Uri,
  viewColumn: vscode.ViewColumn = vscode.ViewColumn.Active,
): Promise<void> {
  let uri = await resolvePrismaUri(resource, false);
  if (!uri) {
    uri = await createContractFile();
  }
  if (uri && isAllowedPrismaUri(uri)) {
    await vscode.commands.executeCommand("vscode.openWith", uri, EDITOR_VIEW_TYPE, viewColumn);
  }
}

async function openPrismaSplitView(): Promise<void> {
  let uri = await resolvePrismaUri(undefined, false);
  if (!uri) {
    uri = await createContractFile();
  }
  if (!uri) return;
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.One,
    preview: false,
  });
  await openPrismaEditor(uri, vscode.ViewColumn.Beside);
  await vscode.commands.executeCommand("workbench.action.closeSidebar");
}

async function createContractFile(workspaceUri?: vscode.Uri): Promise<vscode.Uri | undefined> {
  const targetFolder = workspaceUri ?? vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!targetFolder) return undefined;

  const contractUri = vscode.Uri.joinPath(targetFolder, "contract.prisma");
  const defaultContent = `// SchemaPad Prisma Contract
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
`;

  try {
    const edit = new vscode.WorkspaceEdit();
    edit.createFile(contractUri, { ignoreIfExists: true, overwrite: true });
    edit.insert(contractUri, new vscode.Position(0, 0), defaultContent);
    const applied = await vscode.workspace.applyEdit(edit);
    return applied ? contractUri : undefined;
  } catch (error) {
    void vscode.window.showErrorMessage(
      `Failed to create contract.prisma: ${error instanceof Error ? error.message : String(error)}`
    );
    return undefined;
  }
}

async function resolvePrismaUri(
  resource?: vscode.Uri,
  allowPicker = false,
): Promise<vscode.Uri | undefined> {
  if (resource && isAllowedPrismaUri(resource)) return resource;

  const activeDocument = vscode.window.activeTextEditor?.document;
  if (activeDocument && isAllowedPrismaUri(activeDocument.uri)) return activeDocument.uri;

  const contracts = await vscode.workspace.findFiles(
    "**/contract.prisma",
    "**/{node_modules,.git,.next,dist,build}/**",
    20,
  );
  if (contracts.length === 1 || (!allowPicker && contracts.length > 0)) return contracts[0];

  if (contracts.length > 1) {
    const selected = await vscode.window.showQuickPick(
      contracts.map((candidate) => ({
        label: vscode.workspace.asRelativePath(candidate),
        uri: candidate,
      })),
      { placeHolder: "Choose the contract.prisma file to open in SchemaPad" },
    );
    return selected?.uri;
  }

  const schemas = await vscode.workspace.findFiles(
    "**/*.prisma",
    "**/{node_modules,.git,.next,dist,build}/**",
    allowPicker ? 20 : 1,
  );
  if (schemas.length === 1 || (!allowPicker && schemas.length > 0)) return schemas[0];

  if (schemas.length > 1) {
    const selected = await vscode.window.showQuickPick(
      schemas.map((candidate) => ({
        label: vscode.workspace.asRelativePath(candidate),
        uri: candidate,
      })),
      { placeHolder: "Choose a Prisma file to open in SchemaPad" },
    );
    return selected?.uri;
  }

  if (!allowPicker) return undefined;

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  type LaunchAction = { action: "create" | "browse" } & vscode.QuickPickItem;
  const choices: LaunchAction[] = [];

  if (workspaceFolder) {
    choices.push({
      label: "$(file-add) Create contract.prisma in workspace",
      description: "Create contract.prisma at workspace root and launch SchemaPad",
      action: "create",
    });
  }
  choices.push({
    label: "$(folder-opened) Browse for existing .prisma file...",
    description: "Open a file picker to choose a .prisma file from disk",
    action: "browse",
  });

  const selectedChoice = await vscode.window.showQuickPick(choices, {
    placeHolder: "No Prisma schema found in workspace. Choose how to launch SchemaPad:",
  });

  if (!selectedChoice) return undefined;

  if (selectedChoice.action === "create") {
    return await createContractFile(workspaceFolder?.uri);
  }

  const selectedFiles = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { "Prisma schema": ["prisma"] },
    openLabel: "Open in SchemaPad",
  });
  return selectedFiles?.[0];
}

function isContractPrisma(uri: vscode.Uri): boolean {
  return isAllowedPrismaUri(uri) && uri.path.split("/").at(-1)?.toLowerCase() === "contract.prisma";
}

function isAllowedPrismaUri(uri: vscode.Uri): boolean {
  return ["file", "vscode-remote", "vscode-vfs"].includes(uri.scheme) &&
    uri.path.toLowerCase().endsWith(".prisma");
}

class SchemaPadEditorProvider implements vscode.CustomTextEditorProvider {
  private readonly panels = new Set<vscode.WebviewPanel>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  async showCommandCenter(): Promise<void> {
    let panel = [...this.panels].find((candidate) => candidate.active) ??
      [...this.panels].find((candidate) => candidate.visible);

    if (!panel) {
      await openPrismaEditor();
      // Allow brief delay for webview to load
      await new Promise((resolve) => setTimeout(resolve, 300));
      panel = [...this.panels].find((candidate) => candidate.active) ??
        [...this.panels].find((candidate) => candidate.visible);
    }
    void panel?.webview.postMessage({ type: "openCommandCenter" });
  }

  resetOnboarding(): void {
    for (const panel of this.panels) {
      void panel.webview.postMessage({ type: "resetOnboarding" });
      void panel.webview.postMessage({ type: "onboardingState", completed: false });
    }
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    if (!isAllowedPrismaUri(document.uri)) {
      panel.webview.options = { enableScripts: false };
      panel.webview.html = "<!doctype html><p>SchemaPad only opens .prisma documents.</p>";
      return;
    }
    const webviewRoot = configureWebview(panel.webview, this.context.extensionUri);
    this.panels.add(panel);
    panel.onDidDispose(() => this.panels.delete(panel));
    panel.iconPath = vscode.Uri.joinPath(
      this.context.extensionUri,
      "dist",
      "webview",
      "assets",
      "Icon.png",
    );
    panel.title = `SchemaPad: ${document.fileName.split(/[\\/]/).at(-1)}`;
    bindDocumentToWebview(document, panel, this.context, (listener) => panel.onDidDispose(listener));
    panel.webview.html = getWebviewHtml(panel.webview, webviewRoot);
  }
}

interface SchemaPadSidebarAction {
  label: string;
  description: string;
  command: string;
  icon: string;
}

class SchemaPadSidebarProvider implements vscode.TreeDataProvider<SchemaPadSidebarAction> {
  private readonly actions: SchemaPadSidebarAction[] = [
    {
      label: "Open SchemaPad",
      description: "Launch visual editor canvas",
      command: "schemaPad.openContract",
      icon: "open-preview",
    },
    {
      label: "Open in Split View",
      description: "Prisma text left · SchemaPad right",
      command: "schemaPad.openSplitView",
      icon: "split-horizontal",
    },
  ];

  getTreeItem(action: SchemaPadSidebarAction): vscode.TreeItem {
    const item = new vscode.TreeItem(action.label, vscode.TreeItemCollapsibleState.None);
    item.description = action.description;
    item.tooltip = `${action.label} — ${action.description}`;
    item.iconPath = new vscode.ThemeIcon(action.icon);
    item.command = { command: action.command, title: action.label };
    return item;
  }

  getChildren(): SchemaPadSidebarAction[] {
    // Keep the native provider empty so VS Code renders the prominent viewsWelcome actions.
    return [];
  }
}

function bindDocumentToWebview(
  document: vscode.TextDocument,
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext,
  onDispose: (listener: () => void) => vscode.Disposable,
): void {
  const webview = panel.webview;
  let activeWrite:
    | { requestId: string; text: string; baseVersion: number; conflicted: boolean }
    | undefined;
  const aiRequests = new Map<string, AbortController>();
  const disposables: vscode.Disposable[] = [];

  const postOnboardingState = () => {
    const completed = context.globalState.get<boolean>(ONBOARDING_COMPLETED_KEY, false);
    void webview.postMessage({ type: "onboardingState", completed });
  };

  const postDocument = () => {
    void webview.postMessage({
      type: "documentChanged",
      text: document.getText(),
      version: document.version,
      origin: "file",
      uri: document.uri.toString(),
    });
  };

  const postLayout = () => {
    const panelColumn = panel.viewColumn;
    const contractVisibleBeside = panelColumn !== undefined && vscode.window.visibleTextEditors.some(
      (editor) => editor.document.uri.toString() === document.uri.toString() &&
        editor.viewColumn !== undefined &&
        editor.viewColumn !== panelColumn,
    );
    void webview.postMessage({ type: "layoutChanged", contractVisibleBeside });
  };

  const rejectWrite = (requestId: string, reason: string) => {
    void webview.postMessage({
      type: "writeRejected",
      requestId,
      reason,
      text: document.getText(),
      version: document.version,
    });
  };

  disposables.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() !== document.uri.toString()) return;

      const text = event.document.getText();
      if (activeWrite && text === activeWrite.text) return;
      if (activeWrite) activeWrite.conflicted = true;
      postDocument();
    }),
    vscode.window.onDidChangeVisibleTextEditors(postLayout),
    panel.onDidChangeViewState(postLayout),
    webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      if (message.type === "ready" || message.type === "requestDocument") {
        postDocument();
        postLayout();
        postOnboardingState();
        return;
      }

      if (message.type === "requestOnboardingState") {
        postOnboardingState();
        return;
      }

      if (message.type === "setOnboardingCompleted") {
        await context.globalState.update(ONBOARDING_COMPLETED_KEY, message.completed ?? true);
        postOnboardingState();
        return;
      }

      if (message.type === "openTextEditor") {
        await vscode.commands.executeCommand(
          "vscode.openWith",
          document.uri,
          "default",
          vscode.ViewColumn.Beside,
        );
        postLayout();
        return;
      }

      if (message.type === "aiAbort") {
        aiRequests.get(message.requestId)?.abort();
        aiRequests.delete(message.requestId);
        return;
      }

      if (message.type === "aiRequest") {
        if (typeof message.requestId !== "string" || aiRequests.has(message.requestId)) return;
        let serializedBody = "";
        try {
          serializedBody = JSON.stringify(message.body);
        } catch {
          void webview.postMessage({
            type: "aiResponseError",
            requestId: message.requestId,
            message: "The AI request could not be serialized.",
          });
          return;
        }
        if (!serializedBody || new TextEncoder().encode(serializedBody).byteLength > MAX_AI_REQUEST_BYTES) {
          void webview.postMessage({
            type: "aiResponseError",
            requestId: message.requestId,
            message: "The AI request is too large.",
          });
          return;
        }

        const controller = new AbortController();
        aiRequests.set(message.requestId, controller);
        void proxyAiRequest(message.requestId, serializedBody, controller, webview)
          .finally(() => aiRequests.delete(message.requestId));
        return;
      }

      if (message.type !== "schemaChanged") return;
      if (
        typeof message.requestId !== "string" ||
        typeof message.text !== "string" ||
        typeof message.baseVersion !== "number"
      ) return;

      if (activeWrite) {
        rejectWrite(message.requestId, "Another SchemaPad update is still being saved. Retrying…");
        return;
      }

      if (message.baseVersion !== document.version) {
        rejectWrite(
          message.requestId,
          "contract.prisma changed before the canvas update was applied. The canvas was refreshed.",
        );
        return;
      }

      if (message.text === document.getText()) {
        void webview.postMessage({
          type: "writeAccepted",
          requestId: message.requestId,
          version: document.version,
          text: message.text,
        });
        return;
      }

      const write = {
        requestId: message.requestId,
        text: message.text,
        baseVersion: message.baseVersion,
        conflicted: false,
      };
      activeWrite = write;
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, fullDocumentRange(document), message.text);
      let applied = false;
      try {
        applied = await vscode.workspace.applyEdit(edit);
      } catch {
        applied = false;
      }

      if (activeWrite !== write) return;
      activeWrite = undefined;

      if (applied && !write.conflicted && document.getText() === write.text) {
        void webview.postMessage({
          type: "writeAccepted",
          requestId: write.requestId,
          version: document.version,
          text: document.getText(),
        });
      } else {
        rejectWrite(
          write.requestId,
          write.conflicted
            ? "contract.prisma changed while SchemaPad was saving. The text editor version was kept."
            : "VS Code could not apply the SchemaPad edit.",
        );
      }
    }),
  );

  onDispose(() => {
    aiRequests.forEach((controller) => controller.abort());
    aiRequests.clear();
    disposables.forEach((disposable) => disposable.dispose());
  });
}

async function proxyAiRequest(
  requestId: string,
  body: string,
  controller: AbortController,
  webview: vscode.Webview,
): Promise<void> {
  try {
    const response = await fetch(AI_CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    await webview.postMessage({
      type: "aiResponseStarted",
      requestId,
      status: response.status,
      contentType: response.headers.get("Content-Type") ?? "text/event-stream",
    });

    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) await webview.postMessage({ type: "aiResponseChunk", requestId, chunk });
      }
      const finalChunk = decoder.decode();
      if (finalChunk) {
        await webview.postMessage({ type: "aiResponseChunk", requestId, chunk: finalChunk });
      }
    }
    await webview.postMessage({ type: "aiResponseEnded", requestId });
  } catch (error) {
    if (controller.signal.aborted) return;
    await webview.postMessage({
      type: "aiResponseError",
      requestId,
      message: error instanceof Error ? error.message : "The SchemaPad AI request failed.",
    });
  }
}

function configureWebview(webview: vscode.Webview, extensionUri: vscode.Uri): vscode.Uri {
  const webviewRoot = vscode.Uri.joinPath(extensionUri, "dist", "webview");
  webview.options = {
    enableScripts: true,
    localResourceRoots: [webviewRoot],
  };
  return webviewRoot;
}

function getWebviewHtml(webview: vscode.Webview, webviewRoot: vscode.Uri): string {
  const nonce = createNonce();
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewRoot, "webview.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewRoot, "webview.css"));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; connect-src 'none';" />
    <link rel="stylesheet" href="${styleUri}" />
    <title>SchemaPad</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
  </body>
</html>`;
}

function getSidebarRedirectHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body style="padding:12px;color:var(--vscode-descriptionForeground);font-family:var(--vscode-font-family);font-size:12px;">
    Opening the SchemaPad launcher…
  </body>
</html>`;
}

function getSidebarHtml(webview: vscode.Webview, mediaRoot: vscode.Uri): string {
  const nonce = createNonce();
  const iconUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "Icon.png"));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
    <title>SchemaPad actions</title>
    <style nonce="${nonce}">
      * { box-sizing: border-box; }
      html, body { width: 100%; margin: 0; padding: 0; }
      body { background: var(--vscode-sideBar-background); color: var(--vscode-sideBar-foreground); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
      main { padding: 10px 12px 16px; }
      .brand { display: flex; align-items: center; gap: 9px; margin: 2px 0 12px; }
      .brand img { width: 24px; height: 24px; object-fit: contain; }
      .brand strong { font-size: 13px; }
      .lead { margin: 0 0 14px; color: var(--vscode-descriptionForeground); font-size: 12px; line-height: 1.45; }
      .actions { display: grid; gap: 8px; }
      button { width: 100%; min-height: 54px; padding: 9px 10px; border: 1px solid var(--vscode-button-border, transparent); border-radius: 4px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); text-align: left; cursor: pointer; font: inherit; }
      button:hover { background: var(--vscode-button-secondaryHoverBackground); }
      button:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px; }
      button strong { display: block; margin-bottom: 3px; font-size: 12px; line-height: 1.3; }
      button small { display: block; color: var(--vscode-descriptionForeground); font-size: 11px; line-height: 1.35; }
    </style>
  </head>
  <body>
    <main>
      <div class="brand"><img src="${iconUri}" alt="" /><strong>SchemaPad</strong></div>
      <p class="lead">Design and visualize database schemas interactively in VS Code.</p>
      <div class="actions">
        <button data-action="open"><strong>Open SchemaPad</strong><small>Launch visual editor canvas.</small></button>
        <button data-action="split"><strong>Open in Split View</strong><small>Prisma text left · SchemaPad right.</small></button>
      </div>
    </main>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      document.querySelector('[data-action="open"]').addEventListener('click', () => vscode.postMessage({ type: 'openSchemaPad' }));
      document.querySelector('[data-action="split"]').addEventListener('click', () => vscode.postMessage({ type: 'openSplitView' }));
    </script>
  </body>
</html>`;
}

function fullDocumentRange(document: vscode.TextDocument): vscode.Range {
  const lastLine = document.lineAt(Math.max(0, document.lineCount - 1));
  return new vscode.Range(new vscode.Position(0, 0), lastLine.rangeIncludingLineBreak.end);
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let index = 0; index < 32; index += 1) {
    value += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return value;
}
