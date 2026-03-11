'use client';

import { useEffect, useState } from 'react';
import { getDashboardMetrics, DashboardMetrics } from '@/lib/api/admin';
import { ShoppingBag, DollarSign, AlertTriangle, RefreshCcw } from 'lucide-react';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';

import { WithRoleGuard } from '@/components/admin/WithRoleGuard';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>;
  if (!metrics) return null;

  const stats = [
    { label: 'Orders Today', value: metrics.ordersToday, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Revenue Today', value: `₹${metrics.revenueToday}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Low Stock Variants', value: metrics.lowStockCount, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Open Returns', value: metrics.openReturnsCount, icon: RefreshCcw, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  return (
    <WithRoleGuard allowedRoles={['superAdmin', 'inventoryManager', 'supportAgent']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Daily Operations</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time overview of today's store performance.</p>
        </div>
        
        {error && <div className="text-red-500 bg-red-950/20 p-4 rounded-md">Error: {error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-400">{stat.label}</span>
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="text-3xl font-medium text-[var(--fs-linen)]">
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Placeholder for recent activity feed or charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6 min-h-[300px] flex items-center justify-center text-gray-500 text-sm">
            Sales Chart (Placeholder)
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 min-h-[300px] flex items-center justify-center text-gray-500 text-sm">
            Recent Activity (Placeholder)
          </div>
        </div>
      </div>
    </WithRoleGuard>
  );
}
