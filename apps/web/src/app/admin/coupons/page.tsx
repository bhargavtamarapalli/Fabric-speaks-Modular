'use client';

import { useEffect, useState } from 'react';
import { SuperAdminOnly } from '@/components/admin/WithRoleGuard';
import { AdminTable } from '@/components/admin/AdminTable';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { apiFetch } from '@/lib/apiClient';
import { Plus, Percent } from 'lucide-react';
import { useConfirmationModal } from '@/components/admin/ConfirmationModal';

interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minPurchaseAmount: number;
  maxDiscountAmount: number | null;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const { requestConfirmation } = useConfirmationModal();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: Coupon[] }>('GET', '/api/v1/admin/coupons', undefined, { withCredentials: true });
      setCoupons(res.items || (res as any));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleState = async (coupon: Coupon) => {
    const newState = !coupon.isActive;
    const confirmed = await requestConfirmation({
      title: `${newState ? 'Enable' : 'Disable'} Coupon`,
      message: `Set voucher ${coupon.code} to ${newState ? 'ACTIVE' : 'INACTIVE'}?`,
      confirmLabel: 'Confirm'
    });

    if (confirmed) {
      try {
        await apiFetch('PATCH', `/api/v1/admin/coupons/${coupon.id}`, {
          isActive: newState
        }, { withCredentials: true });
        loadData();
      } catch (err: any) {
        alert(err.message || 'Operation failed');
      }
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>;

  return (
    <SuperAdminOnly>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Coupon Vouchers</h1>
            <p className="text-gray-400 text-sm mt-1">Manage platform promotional logic computationally.</p>
          </div>
          <button 
            // Navigation to form omitted for brevity - opening generic alert
            onClick={() => alert('Coupon form coming soon')}
            className="px-4 py-2 bg-[var(--fs-linen)] text-[var(--fs-void)] hover:bg-gray-200 text-sm rounded flex items-center gap-2 font-medium transition"
          >
            <Plus className="w-4 h-4" /> New Code
          </button>
        </div>

        <AdminTable
          data={coupons}
          globalSearchField="code"
          searchPlaceholder="Search CODE..."
          columns={[
            { header: 'Promo Code', accessor: (row) => <span className="font-mono tracking-widest">{row.code}</span> },
            { 
              header: 'Value', 
              accessor: (row) => row.discountType === 'PERCENTAGE' 
                ? <span className="flex items-center gap-1"><Percent className="w-3 h-3"/> {row.discountValue}</span> 
                : `₹${row.discountValue}` 
            },
            { header: 'Min Spend', accessor: (row) => `₹${row.minPurchaseAmount}` },
            { header: 'Expires', accessor: (row) => new Date(row.validUntil).toLocaleDateString(), sortable: true },
            { 
              header: 'State', 
              accessor: (row) => (
                <button 
                  onClick={() => handleToggleState(row)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border transition ${
                    row.isActive ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900 hover:bg-emerald-900' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  {row.isActive ? 'Live' : 'Paused'}
                </button>
              )
            }
          ]}
        />
      </div>
    </SuperAdminOnly>
  );
}
