'use client';

type ServiceId =
  | 'gateway'
  | 'auth'
  | 'admin'
  | 'catalog'
  | 'order'
  | 'inventory'
  | 'returns'
  | 'support';

type HealthState = {
  status: 'ok' | 'down' | 'unknown';
  checkedAt: number;
  message?: string;
};

const CACHE_TTL_MS = 30_000;
const healthCache = new Map<ServiceId, HealthState>();
const pending = new Map<ServiceId, Promise<HealthState>>();

function now() {
  return Date.now();
}

function isFresh(state: HealthState) {
  return now() - state.checkedAt < CACHE_TTL_MS;
}

function getHealthBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  if (!base) return '';
  const trimmed = base.replace(/\/+$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

async function fetchHealth(service: ServiceId): Promise<HealthState> {
  try {
    const base = getHealthBaseUrl();
    const url = base ? `${base}/health/${service}` : `/api/v1/health/${service}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, {
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { status: 'down', checkedAt: now(), message: `HTTP ${res.status}` };
    }
    return { status: 'ok', checkedAt: now() };
  } catch {
    return { status: 'down', checkedAt: now(), message: 'Unreachable' };
  }
}

export async function getServiceHealth(service: ServiceId): Promise<HealthState> {
  const cached = healthCache.get(service);
  if (cached && isFresh(cached)) {
    return cached;
  }

  if (pending.has(service)) {
    return pending.get(service)!;
  }

  const request = fetchHealth(service).then((state) => {
    healthCache.set(service, state);
    pending.delete(service);
    return state;
  });
  pending.set(service, request);
  return request;
}

export function getServiceFromAdminPath(url: string): ServiceId | null {
  if (!url.startsWith('/admin')) return null;

  if (url.startsWith('/admin/orders')) return 'order';
  if (url.startsWith('/admin/returns')) return 'returns';
  if (url.startsWith('/admin/inventory')) return 'inventory';
  if (url.startsWith('/admin/products')) return 'catalog';
  if (url.startsWith('/admin/categories')) return 'catalog';
  if (url.startsWith('/admin/collections')) return 'catalog';
  if (url.startsWith('/admin/stories')) return 'catalog';
  if (url.startsWith('/admin/support')) return 'support';

  return 'admin';
}

export async function ensureServiceHealthy(url: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const service = getServiceFromAdminPath(url);
  if (!service) return;
  // Best-effort health precheck only. We should not block functional API requests
  // because health endpoints can be down while the actual route remains reachable.
  await getServiceHealth(service);
}
