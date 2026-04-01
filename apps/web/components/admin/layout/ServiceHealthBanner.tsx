'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getServiceHealth, getServiceFromAdminPath } from '@/lib/admin/serviceHealth';
import { ActionButton } from '@/components/admin/shared';
import { AlertCircle, Copy, Terminal } from 'lucide-react';

function getStartCommand(serviceId: string) {
  switch (serviceId) {
    case 'gateway': return 'npm run dev:gateway';
    case 'auth': return 'npm --workspaces=false --prefix services/auth-service run dev';
    case 'admin': return 'npm run dev:admin';
    case 'catalog': return 'npm --workspaces=false --prefix services/catalog-service run dev';
    case 'order': return 'npm --workspaces=false --prefix services/order-service run dev';
    case 'inventory': return 'npm --workspaces=false --prefix services/inventory-service run dev';
    case 'returns': return 'npm --workspaces=false --prefix services/return-service run dev';
    case 'support': return 'npm --workspaces=false --prefix services/support-service run dev';
    default: return 'npm run dev:services';
  }
}

function getRequiredServiceCommands(pathname: string) {
  const required = new Set<string>();
  required.add('gateway');
  required.add('auth');

  const pageService = getServiceFromAdminPath(pathname);
  if (pageService) required.add(pageService);

  return Array.from(required).map((svc) => getStartCommand(svc));
}

export function ServiceHealthBanner() {
  const pathname = usePathname();
  const [serviceDown, setServiceDown] = useState<{ id: string; message?: string } | null>(null);
  const [showServiceCommands, setShowServiceCommands] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const check = async () => {
      const service = getServiceFromAdminPath(pathname);
      if (!service) {
        if (!cancelled) setServiceDown(null);
        return;
      }

      try {
        const health = await getServiceHealth(service);
        if (health.status === 'down') {
          if (!cancelled) setServiceDown({ id: service, message: health.message });
        } else {
          if (!cancelled) setServiceDown(null);
          if (!cancelled) setShowServiceCommands(false);
        }
      } catch {
        if (!cancelled) setServiceDown({ id: service, message: 'Unreachable' });
      }
    };

    check();
    interval = setInterval(check, 30000);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [pathname]);

  if (!serviceDown) return null;

  return (
    <div className="mb-6 p-4 rounded-lg border border-[var(--fs-error)] bg-[var(--fs-error)]/10 text-[var(--fs-ivory)] shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-start gap-4 flex-col sm:flex-row">
        
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-[var(--fs-error)] flex-shrink-0" />
          <div className="flex flex-col">
             <span className="font-semibold text-base uppercase tracking-wide text-[var(--fs-error)]">
               {serviceDown.id} service is offline
             </span>
             <span className="text-xs text-[var(--fs-ash)] mt-0.5">
               {serviceDown.message ? `Reason: ${serviceDown.message}` : 'This page depends on a service that is unreachable.'}
             </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:ml-auto w-full sm:w-auto">
          <ActionButton
            variant="ghost"
            onClick={() => setShowServiceCommands((prev) => !prev)}
            className="w-full sm:w-auto flex justify-center !border !border-[var(--fs-wire)] hover:!bg-[var(--fs-surface-2)]"
          >
            <Terminal className="w-4 h-4 mr-2" />
            {showServiceCommands ? 'Hide Start Commands' : 'Start Required Services'}
          </ActionButton>

          {showServiceCommands && (
            <ActionButton
              variant="ghost"
              onClick={async () => {
                const cmds = getRequiredServiceCommands(pathname).join('\n');
                try {
                  await navigator.clipboard.writeText(cmds);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setCopied(false);
                }
              }}
              className="w-full sm:w-auto flex justify-center !border !border-[var(--fs-wire)] hover:!bg-[var(--fs-surface-2)]"
            >
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Copied' : 'Copy Commands'}
            </ActionButton>
          )}
        </div>
      </div>

      {showServiceCommands && (
        <div className="mt-4 p-4 rounded-md bg-[var(--fs-surface-2)] border border-[var(--fs-wire)] font-mono text-[11px] sm:text-xs text-[var(--fs-linen)] grid gap-1.5 overflow-x-auto whitespace-pre">
          {getRequiredServiceCommands(pathname).map((cmd) => (
            <div key={cmd} className="break-all">{cmd}</div>
          ))}
        </div>
      )}
    </div>
  );
}
