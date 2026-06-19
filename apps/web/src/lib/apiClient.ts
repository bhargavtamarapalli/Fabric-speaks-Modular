export interface ApiFetchOptions extends RequestInit {
  data?: unknown;
  signal?: AbortSignal;
  _retry?: boolean; // Internal flag to prevent refresh loops
}

export class ApiError extends Error {
  code?: string;
  statusCode?: number;
  
  constructor(code: string, message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode || 0;
  }
}

function isFormData(body: BodyInit | null | undefined): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

// NEXT_PUBLIC_API_URL is expected to be something like 'http://localhost:4000/api/v1'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/**
 * Registry to store the CSRF token received from the server.
 */
let csrfToken: string | null = null;

let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  
  refreshPromise = (async () => {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });
      return refreshRes.ok;
    } catch (e) {
      console.error('[API Client] Token refresh network error', e);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { data, headers, body, signal, method = 'GET', _retry = false, ...rest } = options;
  
  const resolvedBody =
    body ??
    (data === undefined
      ? undefined
      : typeof data === 'string'
        ? data
        : JSON.stringify(data));

  const mergedHeaders: Record<string, string> = {
    ...((headers as Record<string, string>) || {}),
    ...(isFormData(resolvedBody) ? {} : { 'Content-Type': 'application/json' }),
  };

  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  if (isMutating) {
    const token = csrfToken || (typeof document !== 'undefined' && document.cookie.match(new RegExp('(^| )csrf-token=([^;]+)'))?.[2]);
    if (token) {
      mergedHeaders['X-CSRF-Token'] = token;
    }
  }

  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;

  const res = await fetch(url, {
    ...rest,
    method,
    body: resolvedBody,
    headers: mergedHeaders,
    credentials: 'include',
    signal,
  });

  const newToken = res.headers.get('X-CSRF-Token');
  if (newToken) {
    csrfToken = newToken;
  }

  if (res.status === 401 && !_retry && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
    const refreshed = await performRefresh();
    if (refreshed) {
      return await apiFetch<T>(path, { ...options, _retry: true });
    }
  }

  if (res.status === 204) return null as T;

  const contentType = res.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!isJson) {
    if (!res.ok) throw new ApiError('HTTP_ERROR', `Request failed with status ${res.status}`, res.status);
    return (await res.text()) as any;
  }

  const payload: { success?: boolean; data?: T; error?: { message?: string; code?: string } } = await res.json();

  if (!res.ok || !payload.success) {
    throw new ApiError(payload.error?.code || 'API_ERROR', payload.error?.message || 'API Error', res.status);
  }
  
  return payload.data as T;
}

/**
 * Unified API Client
 */
export const apiClient = {
  get: <T>(path: string, options?: ApiFetchOptions) => 
    apiFetch<T>(path, { ...options, method: 'GET' }),
    
  post: <T_Req, T_Res = any>(path: string, data?: T_Req, options?: ApiFetchOptions) => 
    apiFetch<T_Res>(path, { ...options, method: 'POST', data }),
    
  put: <T_Req, T_Res = any>(path: string, data?: T_Req, options?: ApiFetchOptions) => 
    apiFetch<T_Res>(path, { ...options, method: 'PUT', data }),
    
  patch: <T_Req, T_Res = any>(path: string, data?: T_Req, options?: ApiFetchOptions) => 
    apiFetch<T_Res>(path, { ...options, method: 'PATCH', data }),
    
  delete: <T_Res = any>(path: string, options?: ApiFetchOptions) => 
    apiFetch<T_Res>(path, { ...options, method: 'DELETE' }),

  request: <T_Req, T_Res = any>(config: { url: string; method?: string; data?: T_Req; signal?: AbortSignal }) =>
    apiFetch<T_Res>(config.url, { method: config.method, data: config.data, signal: config.signal })
};
