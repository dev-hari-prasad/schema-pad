import { useEffect, useState } from "react";
import { useSchemaStore } from "@/store/schemaStore";
import {
  parsePrismaDocument,
  semanticSchemaSignature,
  updatePrismaDocument,
  type PrismaMetadata,
} from "./prismaSync";
import { getVsCodeApi } from "./vscodeApi";

type SyncStatus =
  | { kind: "loading"; message: string }
  | { kind: "saved"; message: string }
  | { kind: "saving"; message: string }
  | { kind: "error"; message: string };

type HostMessage =
  | {
      type: "documentChanged";
      text: string;
      version: number;
      origin: "file";
      uri: string;
    }
  | { type: "writeAccepted"; requestId: string; version: number; text: string }
  | { type: "layoutChanged"; contractVisibleBeside: boolean }
  | { type: "openCommandCenter" }
  | { type: "resetOnboarding" }
  | { type: "onboardingState"; completed: boolean }
  | {
      type: "writeRejected";
      requestId: string;
      reason: string;
      version: number;
      text: string;
    }
  | { type: "noDocument"; reason: string };

interface PendingWrite {
  requestId: string;
  text: string;
  signature: string;
  metadata: PrismaMetadata;
  timeout: ReturnType<typeof setTimeout>;
}

const EMPTY_METADATA: PrismaMetadata = {
  tableOrigins: {},
  columnOrigins: {},
  relationshipOrigins: {},
};

const WRITE_TIMEOUT_MS = 8_000;

export function SchemaPadBridge(): JSX.Element {
  const [contractVisibleBeside, setContractVisibleBeside] = useState(false);
  const [statusAutoExpanded, setStatusAutoExpanded] = useState(false);
  const [status, setStatus] = useState<SyncStatus>({
    kind: "loading",
    message: "Opening contract.prisma…",
  });

  useEffect(() => {
    if (status.kind !== "error") {
      setStatusAutoExpanded(false);
      return;
    }
    setStatusAutoExpanded(true);
    const timer = window.setTimeout(() => setStatusAutoExpanded(false), 5_000);
    return () => window.clearTimeout(timer);
  }, [status.kind, status.message]);

  useEffect(() => {
    const vscode = getVsCodeApi();
    let loaded = false;
    let applyingDocument = false;
    let queued = false;
    let source = "";
    let version = 0;
    let metadata = EMPTY_METADATA;
    let committedSignature = "";
    let requestSequence = 0;
    let pending: PendingWrite | undefined;
    let flushTimer: ReturnType<typeof setTimeout> | undefined;

    const clearPending = () => {
      if (pending) clearTimeout(pending.timeout);
      pending = undefined;
    };

    const scheduleFlush = (delay = 0) => {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(flushCanvas, delay);
    };

    const applyDocument = (text: string, nextVersion: number) => {
      source = text;
      version = nextVersion;
      queued = false;
      clearPending();

      try {
        const current = useSchemaStore.getState();
        const parsed = parsePrismaDocument(text, loaded ? current.tables : []);
        metadata = parsed.metadata;
        applyingDocument = true;
        const parsedTableIds = new Set(parsed.tables.map((table) => table.id));
        const parsedColumnIds = new Set(parsed.tables.flatMap((table) => table.columns.map((column) => column.id)));
        useSchemaStore.setState({
          tables: parsed.tables,
          relationships: parsed.relationships,
          groups: loaded ? current.groups : [],
          selectedIds: loaded
            ? current.selectedIds.filter((id) => parsedTableIds.has(id))
            : [],
          editingTableId: loaded && current.editingTableId && parsedTableIds.has(current.editingTableId)
            ? current.editingTableId
            : null,
          editingColumnId: loaded && current.editingColumnId && parsedColumnIds.has(current.editingColumnId)
            ? current.editingColumnId
            : null,
          connectingFrom: null,
          past: [],
          future: [],
        });
        committedSignature = semanticSchemaSignature(parsed.tables, parsed.relationships);
        loaded = true;
        setStatus({ kind: "saved", message: "Synced with contract.prisma" });
      } catch (error) {
        // Keep the last valid canvas visible while the user finishes a partial text edit.
        loaded = true;
        setStatus({ kind: "error", message: readablePrismaError(error) });
      } finally {
        applyingDocument = false;
      }
    };

    function flushCanvas() {
      flushTimer = undefined;
      if (!loaded || applyingDocument) return;
      if (pending) {
        queued = true;
        return;
      }

      const state = useSchemaStore.getState();
      if (state.editingTableId || state.editingColumnId) {
        scheduleFlush(300);
        return;
      }
      const signature = semanticSchemaSignature(state.tables, state.relationships);
      if (signature === committedSignature) return;

      try {
        const updated = updatePrismaDocument(
          source,
          state.tables,
          state.relationships,
          metadata,
        );

        if (updated.text === source) {
          metadata = updated.metadata;
          committedSignature = signature;
          setStatus({ kind: "saved", message: "Synced with contract.prisma" });
          return;
        }

        const requestId = `${version}:${++requestSequence}`;
        const timeout = setTimeout(() => {
          if (pending?.requestId !== requestId) return;
          clearPending();
          setStatus({
            kind: "error",
            message: "Sync response timed out — reconnecting to the Prisma document…",
          });
          vscode.postMessage({ type: "requestDocument" });
        }, WRITE_TIMEOUT_MS);

        // Do not advance source, metadata, or the committed signature until VS Code
        // acknowledges this exact request. This prevents fast edits from being lost.
        pending = {
          requestId,
          text: updated.text,
          signature,
          metadata: updated.metadata,
          timeout,
        };
        setStatus({ kind: "saving", message: "Updating contract.prisma…" });
        vscode.postMessage({
          type: "schemaChanged",
          requestId,
          text: updated.text,
          baseVersion: version,
        });
      } catch (error) {
        setStatus({ kind: "error", message: readablePrismaError(error) });
      }
    }

    const unsubscribe = useSchemaStore.subscribe((state) => {
      if (!loaded || applyingDocument) return;
      const signature = semanticSchemaSignature(state.tables, state.relationships);
      if (pending) {
        if (signature !== pending.signature) queued = true;
        return;
      }
      if (signature === committedSignature) return;
      scheduleFlush(250);
    });

    const onMessage = (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      if (message.type === "layoutChanged") {
        setContractVisibleBeside(message.contractVisibleBeside);
        return;
      }
      if (message.type === "openCommandCenter") {
        window.dispatchEvent(new CustomEvent("schema:open-command-menu"));
        return;
      }
      if (message.type === "resetOnboarding") {
        window.dispatchEvent(new CustomEvent("schema:reset-onboarding"));
        return;
      }
      if (message.type === "documentChanged") {
        // Host-side changes that belong to a canvas write are suppressed there.
        // Therefore every documentChanged message is a genuine text-editor update
        // and becomes the new source of truth, even if a canvas write was pending.
        applyDocument(message.text, message.version);
        return;
      }

      if (message.type === "writeAccepted") {
        if (!pending || message.requestId !== pending.requestId) {
          if (message.version >= version) applyDocument(message.text, message.version);
          return;
        }
        const accepted = pending;
        clearPending();
        source = message.text;
        version = message.version;
        metadata = accepted.metadata;
        committedSignature = accepted.signature;
        setStatus({ kind: "saved", message: "Synced with contract.prisma" });

        const current = useSchemaStore.getState();
        const currentSignature = semanticSchemaSignature(current.tables, current.relationships);
        if (queued || currentSignature !== committedSignature) {
          queued = false;
          scheduleFlush();
        }
        return;
      }

      if (message.type === "writeRejected") {
        if (!pending || message.requestId !== pending.requestId) {
          if (message.version > version) applyDocument(message.text, message.version);
          return;
        }
        applyDocument(message.text, message.version);
        setStatus({ kind: "error", message: message.reason });
        return;
      }

      if (message.type === "noDocument") {
        loaded = false;
        clearPending();
        setStatus({ kind: "error", message: message.reason });
      }
    };

    window.addEventListener("message", onMessage);
    vscode.postMessage({ type: "ready" });

    return () => {
      unsubscribe();
      window.removeEventListener("message", onMessage);
      clearPending();
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, []);

  return (
    <div
      className={`schemapad-sync-status schemapad-sync-status--${status.kind}`}
      data-expanded={statusAutoExpanded}
      aria-label={status.message}
    >
      <span className="schemapad-sync-dot" aria-hidden="true" />
      <span className="schemapad-sync-details">
        <span>{status.message}</span>
        {!contractVisibleBeside && (
          <button
            type="button"
            onClick={() => getVsCodeApi().postMessage({ type: "openTextEditor" })}
          >
            Open contract beside
          </button>
        )}
      </span>
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readablePrismaError(error: unknown): string {
  const message = errorMessage(error);
  const duplicateField = /Duplicate field (.+) in model (.+)/i.exec(message);
  if (duplicateField) {
    return `Waiting for valid syntax — “${duplicateField[2]}.${duplicateField[1]}” is duplicated.`;
  }

  const duplicateModel = /Duplicate Prisma model name: (.+)/i.exec(message);
  if (duplicateModel) {
    return `Waiting for valid syntax — model “${duplicateModel[1]}” is duplicated.`;
  }

  const invalidModel = /Invalid Prisma model name: (.+)/i.exec(message);
  if (invalidModel) {
    return `Waiting for valid syntax — rename model “${invalidModel[1]}”.`;
  }

  const invalidField = /Invalid Prisma field name: (.+)/i.exec(message);
  if (invalidField) {
    return `Waiting for valid syntax — rename field “${invalidField[1]}”.`;
  }

  return "Waiting for valid Prisma syntax — finish or fix the current edit to resume syncing.";
}
