'use client';

// Usage example:
// <ServiceHealthPanel />

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SectionCard, ActionButton, THEME } from '@/components/admin/shared';

type HealthStatus = 'ok' | 'down' | 'unknown' | 'checking';

interface ServiceHealth {
  id: string;
  label: string;
  required: boolean;
  endpoint: string;
}

interface ServiceState {
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
}

const SERVICES: ServiceHealth[] = [
  { id: 'gateway', label: 'Gateway', required: true, endpoint: '/api/v1/health/gateway' },
  { id: 'auth', label: 'Auth', required: true, endpoint: '/api/v1/health/auth' },
  { id: 'admin', label: 'Admin', required: true, endpoint: '/api/v1/health/admin' },
  { id: 'catalog', label: 'Catalog', required: true, endpoint: '/api/v1/health/catalog' },
  { id: 'order', label: 'Order', required: true, endpoint: '/api/v1/health/order' },
  { id: 'inventory', label: 'Inventory', required: true, endpoint: '/api/v1/health/inventory' },
  { id: 'returns', label: 'Returns', required: true, endpoint: '/api/v1/health/returns' },
  { id: 'support', label: 'Support', required: false, endpoint: '/api/v1/health/support' },
];

const STATUS_COLOR: Record<HealthStatus, string> = {
  ok: THEME.colors.success,
  down: THEME.colors.danger,
  unknown: THEME.colors.muted,
  checking: THEME.colors.warning,
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  ok: 'Online',
  down: 'Offline',
  unknown: 'Unknown',
  checking: 'Checking',
};

/**
 * A lightweight service health panel for the admin dashboard.
 * Shows which backend services are reachable via the local gateway.
 */
export function ServiceHealthPanel() {
  const [services, setServices] = useState<Record<string, ServiceState>>(() => {
    const initial: Record<string, ServiceState> = {};
    SERVICES.forEach((svc) => {
      initial[svc.id] = { status: 'checking' };
    });
    return initial;
  });

  const fetchHealth = useCallback(async (svc: ServiceHealth) => {
    const start = performance.now();
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
      const url = base
        ? (base.endsWith('/api/v1') ? `${base}/health/${svc.id}` : `${base}/api/v1/health/${svc.id}`)
        : svc.endpoint;
      const res = await fetch(url, { credentials: 'include' });
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) {
        return { status: 'down' as const, latencyMs, message: `HTTP ${res.status}` };
      }
      return { status: 'ok' as const, latencyMs };
    } catch (err) {
      return { status: 'down' as const, message: 'Unreachable' };
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setServices((prev) => {
      const next = { ...prev };
      SERVICES.forEach((svc) => {
        next[svc.id] = { status: 'checking' };
      });
      return next;
    });

    const results = await Promise.all(
      SERVICES.map(async (svc) => ({
        id: svc.id,
        result: await fetchHealth(svc),
      }))
    );

    setServices((prev) => {
      const next = { ...prev };
      results.forEach(({ id, result }) => {
        next[id] = result;
      });
      return next;
    });
  }, [fetchHealth]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const hasCriticalFailure = useMemo(() => {
    return SERVICES.some((svc) => svc.required && services[svc.id]?.status === 'down');
  }, [services]);

  return (
    <SectionCard
      title="Service Health"
      action={<ActionButton variant="ghost" onClick={refreshAll}>Refresh</ActionButton>}
      accent={hasCriticalFailure}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: THEME.spacing.sm,
      }}>
        {SERVICES.map((svc) => {
          const state = services[svc.id] ?? { status: 'unknown' };
          return (
            <div key={svc.id} style={{
              padding: THEME.spacing.sm,
              borderRadius: THEME.radius.md,
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${THEME.colors.border}`,
              display: 'grid',
              gap: THEME.spacing.xs,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: THEME.spacing.sm }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: THEME.spacing.sm }}>
                  <span style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: STATUS_COLOR[state.status],
                    boxShadow: `0 0 8px ${STATUS_COLOR[state.status]}66`,
                  }} />
                  <span style={{ fontFamily: THEME.fonts.ui, color: THEME.colors.ivory, fontSize: THEME.fontSizes.sm }}>
                    {svc.label}
                  </span>
                </div>
                {!svc.required && (
                  <span style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted }}>
                    Optional
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: THEME.spacing.xs }}>
                <span style={{ color: STATUS_COLOR[state.status], fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>
                  {STATUS_LABEL[state.status]}
                </span>
                <span style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>
                  {state.latencyMs !== undefined ? `${state.latencyMs}ms` : state.message ?? '--'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
