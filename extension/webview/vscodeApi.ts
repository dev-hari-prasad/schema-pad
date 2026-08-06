export interface VsCodeApi<State = unknown> {
  postMessage(message: unknown): void;
  getState(): State | undefined;
  setState(state: State): void;
}

declare global {
  function acquireVsCodeApi<State = unknown>(): VsCodeApi<State>;
}

let api: VsCodeApi | undefined;

export function getVsCodeApi(): VsCodeApi {
  api ??= acquireVsCodeApi();
  return api;
}
