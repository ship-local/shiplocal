const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const DEFAULT_TIMEOUT_MS = 15_000;

export function getApiUrl(): string {
  return API_URL;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string; timeoutMs?: number } = {},
): Promise<T> {
  const { token, headers, body, timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = options;

  const requestHeaders: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...rest,
      body,
      signal: controller.signal,
      headers: {
        ...requestHeaders,
        ...(headers as Record<string, string> | undefined),
      },
    });

    const data: unknown = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof data === 'object' && data !== null && 'error' in data
          ? String((data as { error: unknown }).error)
          : 'Request failed';
      throw new ApiError(message, response.status);
    }

    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Request timed out', 408);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function getGoogleAuthUrl(): string {
  return `${API_URL}/api/auth/google`;
}
