'use client';

import { useEffect, useState } from 'react';
import { SupportAllowed } from '@/components/admin/WithRoleGuard';
import { AdminTable } from '@/components/admin/AdminTable';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { apiFetch } from '@/lib/apiClient';
import { useConfirmationModal } from '@/components/admin/ConfirmationModal';
import { Check, X } from 'lucide-react';

interface ReturnQueueItem {
  id: string;
  orderId: string;
  status: string;
  createdAt: string;
  reason: string;
}

export default function ReturnManagementPage() {
  const [returns, setReturns] = useState<ReturnQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { requestConfirmation } = useConfirmationModal();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: ReturnQueueItem[] }>('GET', '/api/v1/returns/admin/queue', undefined, { withCredentials: true });
      setReturns(res.items || (res as any));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolve = async (returnId: string, resolutionType: 'REFUND' | 'REPLACEMENT') => {
    const confirmed = await requestConfirmation({
      title: `${resolutionType === 'REFUND' ? 'Issue Refund' : 'Ship Replacement'}`,
      message: `Are you sure you want to mark this request as resolved via ${resolutionType}? This action will proxy commands to the Payments and Order clusters respectively.`,
      confirmLabel: 'Confirm Resolution'
    });

    if (confirmed) {
      try {
        await apiFetch('POST', `/api/v1/returns/admin/${returnId}/resolve`, {
          resolution: resolutionType,
          notes: 'Resolved from operations panel'
        }, { withCredentials: true });
        
        loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to resolve return');
      }
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>;

  return (
    <SupportAllowed>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Returns Management</h1>
          <p className="text-gray-400 text-sm mt-1">Review pending customer return requests & proxy 3PL AWB codes.</p>
        </div>

        <AdminTable
          data={returns}
          globalSearchField="orderId"
          searchPlaceholder="Search by Order ID..."
          exportFilename="fs_returns_export.csv"
          columns={[
            { header: 'Return ID', accessor: 'id' },
            { header: 'Order ID', accessor: 'orderId', sortable: true },
            { header: 'Date Opened', accessor: (row) => new Date(row.createdAt).toLocaleDateString(), sortable: true },
            { header: 'Reason provided', accessor: 'reason' },
            { 
              header: 'Status', 
              accessor: (row) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  row.status === 'RESOLVED' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900' : 
                  row.status === 'REJECTED' ? 'bg-red-950/30 text-red-400 border-red-900' : 
                  'bg-amber-950/30 text-amber-400 border-amber-900'
                }`}>
                  {row.status}
                </span>
              ),
              sortable: true
            },
            {
              header: 'Resolve Action',
              accessor: (row) => (
                <div className="flex items-center gap-2">
                  {row.status === 'PENDING' || row.status === 'RECEIVED' ? (
                    <>
                      <button 
                        onClick={() => handleResolve(row.id, 'REFUND')}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 text-green-400 rounded transition"
                        title="Process Refund"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleResolve(row.id, 'REPLACEMENT')}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 text-[var(--fs-linen)] rounded transition text-xs font-medium"
                      >
                        RPLC
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-600">Locked</span>
                  )}
                </div>
              )
            }
          ]}
        />
      </div>
    </SupportAllowed>
  );
}
