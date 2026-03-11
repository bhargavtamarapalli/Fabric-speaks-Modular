'use client';

import { useEffect, useState } from 'react';
import { SupportAllowed } from '@/components/admin/WithRoleGuard';
import { AdminTable } from '@/components/admin/AdminTable';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { apiFetch } from '@/lib/apiClient';
import { MessageSquare, PhoneCall } from 'lucide-react';

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: any[] }>('GET', '/api/v1/support/queue', undefined, { withCredentials: true });
      setTickets(res.items || (res as any));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCustomerLookup = async () => {
    const mobile = prompt('Enter customer registered mobile number to pull 360-View:');
    if (!mobile) return;
    try {
      const res = await apiFetch<any>('GET', `/api/v1/support/customer/${mobile}`, undefined, { withCredentials: true });
      alert(`Lifetime Value lookup complete for ${res.customer.name} \nValue: ₹${res.metrics.lifetimeValue}\nTotal Orders: ${res.metrics.totalOrders}`);
    } catch (err: any) {
      alert(err.message || 'Lookup failed');
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>;

  return (
    <SupportAllowed>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Support Ticketing</h1>
            <p className="text-gray-400 text-sm mt-1">Resolve active support queries and lookup customer lifetime metrics.</p>
          </div>
          <button 
            onClick={handleCustomerLookup}
            className="px-4 py-2 border border-blue-900 bg-blue-950/20 text-blue-400 hover:bg-blue-900 text-sm rounded flex items-center gap-2 transition"
          >
            <PhoneCall className="w-4 h-4" /> Customer 360 Lookup
          </button>
        </div>

        <AdminTable
          data={tickets}
          globalSearchField="id"
          searchPlaceholder="Search Case ID..."
          columns={[
            { header: 'Case ID', accessor: 'id' },
            { header: 'Linked Order', accessor: (row) => row.orderId || 'General Query' },
            { header: 'Customer', accessor: (row) => row.customerMobile || 'Unknown' },
            { 
              header: 'Priority', 
              accessor: (row) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  row.priority === 'P1' ? 'bg-red-950/30 text-red-400 border-red-900' :
                  row.priority === 'P2' ? 'bg-amber-950/30 text-amber-400 border-amber-900' :
                  'bg-gray-800 text-gray-400 border-gray-700'
                }`}>
                  {row.priority}
                </span>
              ),
              sortable: true
            },
            { header: 'Status', accessor: 'status', sortable: true },
            {
              header: 'Action',
              accessor: (row) => (
                <button 
                  onClick={() => alert(`Opening internal chat modal for ${row.id}`)}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-[var(--fs-linen)] text-xs rounded transition flex items-center gap-2"
                >
                  <MessageSquare className="w-3 h-3" /> Reply
                </button>
              )
            }
          ]}
        />
      </div>
    </SupportAllowed>
  );
}
