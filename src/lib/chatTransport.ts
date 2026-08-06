export function requestChatCompletion(
  body: unknown,
  signal: AbortSignal,
): Promise<Response> {
  return fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify(body),
  });
}
