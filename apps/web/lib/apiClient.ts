export interface ApiFetchOptions extends RequestInit {
  data?: unknown;
}

function isFormData(body: BodyInit | null | undefined): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { data, headers, body, ...rest } = options;
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

  const res = await fetch(`/api/v1${path}`, {
    ...rest,
    body: resolvedBody,
    headers: mergedHeaders,
    credentials: 'include',
  });
  const payload = (await res.json()) as { success?: boolean; data?: T; error?: { message?: string } };
  if (!payload.success) throw new Error(payload.error?.message || 'API Error');
  return payload.data as T;
}
