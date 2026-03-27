import { NextRequest } from 'next/server';

/** OIDC / JWT-shaped tokens users sometimes paste into "API key" by mistake. AI Gateway prioritizes Bearer over OIDC even when invalid, which can cause DEPLOYMENT_NOT_FOUND. */
function looksLikeJwt(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

/**
 * Resolves auth for Vercel AI Gateway: env key > real API key from client > OIDC from this deployment > JWT in client (local dev).
 */
function resolveVercelGatewayAuth(req: NextRequest, clientApiKey: string | undefined): string {
  const envKey = process.env.AI_GATEWAY_API_KEY?.trim();
  const oidc = req.headers.get('x-vercel-oidc-token')?.trim();
  const clientKey = clientApiKey?.trim();
  const clientJwtShaped = clientKey && looksLikeJwt(clientKey);

  return (
    envKey ||
    (!clientJwtShaped && clientKey) ||
    oidc ||
    clientKey ||
    ''
  );
}

export async function POST(req: NextRequest) {
  console.log('Hit /api/chat route');
  try {
    const body = await req.json();
    const { baseUrl, apiKey, provider, model, messages, stream } = body;

    const authToken =
      provider === 'vercel' ? resolveVercelGatewayAuth(req, apiKey) : apiKey?.trim();

    if (!baseUrl || !authToken || !model || !messages) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = req.headers.get('origin') || 'http://localhost:3000';
      headers['X-Title'] = 'Schema Pad';
    }

    if (provider === 'vercel') {
      const origin = req.headers.get('origin') || req.headers.get('referer') || 'http://localhost:3000';
      headers['http-referer'] = origin;
      headers['x-title'] = 'Schema Pad';
    }

    let cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    // If the user accidentally included /chat/completions in the base URL, remove it
    if (cleanBaseUrl.endsWith('/chat/completions')) {
      cleanBaseUrl = cleanBaseUrl.slice(0, -17);
    }
    
    const url = `${cleanBaseUrl}/chat/completions`;

    const response = await fetch(`${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream,
        ...(body.tools ? { tools: body.tools } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Upstream API error: ${response.status} ${errorText}`);
      // Return 502 Bad Gateway so the client knows the upstream failed, not the local route
      return new Response(JSON.stringify({ error: `Upstream API error: ${response.status} ${errorText}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return the response directly to stream it back to the client
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
