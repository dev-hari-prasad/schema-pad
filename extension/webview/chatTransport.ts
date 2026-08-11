import { getVsCodeApi } from "./vscodeApi";

type AiHostMessage =
  | { type: "aiResponseStarted"; requestId: string; status: number; contentType: string }
  | { type: "aiResponseChunk"; requestId: string; chunk: string }
  | { type: "aiResponseEnded"; requestId: string }
  | { type: "aiResponseError"; requestId: string; message: string };

export function requestChatCompletion(
  body: unknown,
  signal: AbortSignal,
): Promise<Response> {
  const vscode = getVsCodeApi();
  const requestId = crypto.randomUUID();
  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
  let settled = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
    },
  });

  return new Promise<Response>((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      signal.removeEventListener("abort", onAbort);
    };

    const fail = (message: string) => {
      cleanup();
      if (settled) {
        streamController?.error(new Error(message));
      } else {
        reject(new Error(message));
      }
    };

    const onAbort = () => {
      vscode.postMessage({ type: "aiAbort", requestId });
      cleanup();
      const error = new DOMException("The AI request was stopped.", "AbortError");
      if (settled) streamController?.error(error);
      else reject(error);
    };

    const onMessage = (event: MessageEvent<unknown>) => {
      const message = event.data;
      if (
        !message ||
        typeof message !== "object" ||
        !("type" in message) ||
        !("requestId" in message) ||
        message.requestId !== requestId
      ) return;
      const aiMessage = message as AiHostMessage;

      if (aiMessage.type === "aiResponseStarted") {
        settled = true;
        resolve(new Response(stream, {
          status: aiMessage.status,
          headers: { "Content-Type": aiMessage.contentType },
        }));
      } else if (aiMessage.type === "aiResponseChunk") {
        streamController?.enqueue(encoder.encode(aiMessage.chunk));
      } else if (aiMessage.type === "aiResponseEnded") {
        cleanup();
        streamController?.close();
      } else if (aiMessage.type === "aiResponseError") {
        fail(aiMessage.message);
      }
    };

    window.addEventListener("message", onMessage);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    vscode.postMessage({ type: "aiRequest", requestId, body });
  });
}
