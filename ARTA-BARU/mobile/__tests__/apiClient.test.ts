import { ApiError, createApiClient, type FetchImpl } from '../src/api/client';

const BASE = 'https://api.example.test';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface SeenCall {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

function scriptedFetch(
  respond: (call: SeenCall) => Response | Promise<Response>,
  seen: SeenCall[],
): FetchImpl {
  return async (url, init) => {
    const call: SeenCall = {
      url,
      method: init?.method,
      headers: init?.headers,
      body: init?.body,
    };
    seen.push(call);
    return respond(call);
  };
}

describe('API client (client.ts)', () => {
  it('builds URLs from the configured base and sends JSON with auth header', async () => {
    const seen: SeenCall[] = [];
    const client = createApiClient(
      'https://api.example.test/',
      scriptedFetch(() => jsonResponse(200, { id: 'u1' }), seen),
    );

    const result = await client.request<{ id: string }>({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'a@b.c' },
      token: 'secret-token',
    });

    expect(result).toEqual({ id: 'u1' });
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe('https://api.example.test/api/v1/auth/login');
    expect(seen[0].method).toBe('POST');
    expect(seen[0].headers?.['Content-Type']).toBe('application/json');
    expect(seen[0].headers?.['Authorization']).toBe('Bearer secret-token');
    expect(JSON.parse(seen[0].body ?? '{}')).toEqual({ email: 'a@b.c' });
  });

  it('refuses to send any request when the API URL is not configured', async () => {
    const seen: SeenCall[] = [];
    const client = createApiClient(
      '',
      scriptedFetch(() => jsonResponse(200, {}), seen),
    );

    await expect(
      client.request({ method: 'GET', path: '/me', token: 't' }),
    ).rejects.toMatchObject({ kind: 'missing_api_url' });
    expect(seen).toHaveLength(0);
  });

  it('maps unreachable hosts to network errors', async () => {
    const client = createApiClient(BASE, async () => {
      throw new TypeError('Load failed');
    });

    await expect(
      client.request({ method: 'GET', path: '/me' }),
    ).rejects.toMatchObject({ kind: 'network' });
  });

  it('maps aborts to timeout errors', async () => {
    const hanging: FetchImpl = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    const client = createApiClient(BASE, hanging);

    await expect(
      client.request({ method: 'GET', path: '/me', timeoutMs: 5 }),
    ).rejects.toMatchObject({ kind: 'timeout' });
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [429, 'rate_limited'],
    [500, 'server'],
    [418, 'http'],
  ])('maps status %i to %s', async (status, kind) => {
    const seen: SeenCall[] = [];
    const client = createApiClient(
      BASE,
      scriptedFetch(() => jsonResponse(status, { message: 'm' }), seen),
    );

    const failure = await client
      .request({ method: 'GET', path: '/me' })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ kind, status });
    // Exactly one attempt: server errors are never retried automatically.
    expect(seen).toHaveLength(1);
  });

  it('passes 422 validation details through', async () => {
    const client = createApiClient(
      BASE,
      scriptedFetch(
        () =>
          jsonResponse(422, {
            message: 'Validation failed.',
            errors: { email: ['bad'] },
          }),
        [],
      ),
    );

    const failure = await client
      .request({ method: 'POST', path: '/auth/login', body: {} })
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({
      kind: 'validation',
      status: 422,
      fields: { email: ['bad'] },
    });
  });

  it('rejects non-JSON success bodies as invalid responses', async () => {
    const client = createApiClient(
      BASE,
      scriptedFetch(
        () => new Response('<html>nope</html>', { status: 200 }),
        [],
      ),
    );

    await expect(
      client.request({ method: 'GET', path: '/me' }),
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it('rejects empty success bodies as invalid responses', async () => {
    const client = createApiClient(
      BASE,
      scriptedFetch(() => new Response('', { status: 200 }), []),
    );

    await expect(
      client.request({ method: 'GET', path: '/me' }),
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it('rejects non-JSON error bodies as invalid responses', async () => {
    const client = createApiClient(
      BASE,
      scriptedFetch(
        () => new Response('<html>proxy error</html>', { status: 502 }),
        [],
      ),
    );

    await expect(
      client.request({ method: 'GET', path: '/me' }),
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  });
});
