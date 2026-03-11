'use client';

import { useEffect, useState } from 'react';
import { InventoryAllowed } from '@/components/admin/WithRoleGuard';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { apiFetch } from '@/lib/apiClient';

interface HealthData {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  productId: string;
  variantId: string;
  sku: string;
  qty: number;
}

export default function StockHealthPage() {
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: HealthData[] }>('GET', '/api/v1/inventory/admin/health', undefined, { withCredentials: true })
      .then(res => setHealthData(res.items || (res as any)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>;

  const critical = healthData.filter(d => d.status === 'CRITICAL');
  const warning = healthData.filter(d => d.status === 'WARNING');
  const healthy = healthData.filter(d => d.status === 'HEALTHY');

  return (
    <InventoryAllowed>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Stock Health Diagnostics</h1>
          <p className="text-gray-400 text-sm mt-1">Visualize high-risk stockout variants.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-red-900 bg-red-950/20 rounded-xl p-6 space-y-4">
            <h2 className="text-red-500 font-medium">Critical (0 Stock)</h2>
            <div className="text-4xl text-red-400 font-mono">{critical.length}</div>
            <ul className="space-y-2 text-sm text-gray-300">
              {critical.slice(0, 5).map(i => <li key={i.variantId}>{i.sku}</li>)}
              {critical.length > 5 && <li className="text-gray-500">+{critical.length - 5} more</li>}
            </ul>
          </div>

          <div className="border border-amber-900 bg-amber-950/20 rounded-xl p-6 space-y-4">
            <h2 className="text-amber-500 font-medium">Warning (&#60;= 4)</h2>
            <div className="text-4xl text-amber-400 font-mono">{warning.length}</div>
            <ul className="space-y-2 text-sm text-gray-300">
              {warning.slice(0, 5).map(i => <li key={i.variantId}>{i.sku} ({i.qty} left)</li>)}
              {warning.length > 5 && <li className="text-gray-500">+{warning.length - 5} more</li>}
            </ul>
          </div>

          <div className="border border-emerald-900 bg-emerald-950/20 rounded-xl p-6 space-y-4">
            <h2 className="text-emerald-500 font-medium">Healthy</h2>
            <div className="text-4xl text-emerald-400 font-mono">{healthy.length}</div>
          </div>
        </div>
      </div>
    </InventoryAllowed>
  );
}
