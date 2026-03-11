'use client';

import { useEffect, useState } from 'react';
import { SupportAllowed } from '@/components/admin/WithRoleGuard';
import { AdminTable } from '@/components/admin/AdminTable';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { apiFetch } from '@/lib/apiClient';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

interface AdminOrder {
  id: string;
  displayId: string;
  customerMobile: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  paymentMethod: string;
  paymentStatus: string;
}

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Calling the internal admin order fetch endpoint
    apiFetch<AdminOrder[]>('GET', '/api/v1/orders/admin', undefined, { withCredentials: true })
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>;

  return (
    <SupportAllowed>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Order Management</h1>
            <p className="text-gray-400 text-sm mt-1">View and manage all customer orders.</p>
          </div>
        </div>

        <AdminTable
          data={orders}
          globalSearchField="displayId"
          searchPlaceholder="Search by FS Order ID..."
          exportFilename="fs_orders_export.csv"
          columns={[
            { header: 'Order ID', accessor: 'displayId', sortable: true },
            { header: 'Date', accessor: (row) => new Date(row.createdAt).toLocaleDateString(), sortable: true },
            { header: 'Customer', accessor: 'customerMobile' },
            { header: 'Amount', accessor: (row) => `₹${row.totalAmount}`, sortable: true },
            { 
              header: 'Status', 
              accessor: (row) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  row.status === 'DELIVERED' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900' :
                  row.status === 'CANCELLED' ? 'bg-red-950/30 text-red-400 border-red-900' :
                  'bg-blue-950/30 text-blue-400 border-blue-900'
                }`}>
                  {row.status}
                </span>
              ),
              sortable: true
            },
            { header: 'Payment', accessor: (row) => `${row.paymentMethod} (${row.paymentStatus})` },
            {
              header: 'Action',
              accessor: (row) => (
                <Link 
                  href={`/admin/orders/${row.id}`} 
                  className="text-gray-400 hover:text-[var(--fs-linen)] flex items-center gap-1 text-sm transition"
                >
                  View <ExternalLink className="w-3 h-3" />
                </Link>
              )
            }
          ]}
        />
      </div>
    </SupportAllowed>
  );
}
