export interface ApiFetchOptions extends RequestInit {
  data?: unknown;
  signal?: AbortSignal;
}

function isFormData(body: BodyInit | null | undefined): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { data, headers, body, signal, ...rest } = options;
  const resolvedBody =
    body ??
    (data === undefined
      ? undefined
      : typeof data === 'string'
        ? data
        : JSON.stringify(data));

  const mergedHeaders = {
    ...headers,
    ...(isFormData(resolvedBody) ? {} : { 'Content-Type': 'application/json' }),
  };

  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...rest,
    body: resolvedBody,
    headers: mergedHeaders,
    credentials: 'include',
    signal,
  });

  // Check content-type before parsing as JSON
  const contentType = res.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  let payload: { success?: boolean; data?: T; error?: { message?: string } };
  if (isJson) {
    try {
      payload = await res.json();
    } catch {
      const text = await res.text().catch(() => 'Failed to read response body');
      throw new Error(`JSON parse error: ${res.status} ${res.statusText} - ${text}`);
    }
  } else {
    const text = await res.text().catch(() => 'No response body');
    throw new Error(`Non-JSON response: ${res.status} ${res.statusText} - ${text}`);
  }

  if (!payload.success) throw new Error(payload.error?.message || 'API Error');
  return payload.data as T;
}
