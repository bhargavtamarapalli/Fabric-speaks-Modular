'use client';

import { useEffect, useState } from 'react';
import { InventoryAllowed } from '@/components/admin/WithRoleGuard';
import { AdminTable } from '@/components/admin/AdminTable';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { apiFetch } from '@/lib/apiClient';
import { useConfirmationModal } from '@/components/admin/ConfirmationModal';
import { ClipboardEdit } from 'lucide-react';

interface VariantInventory {
  id: string;
  sku: string;
  size: string;
  color: string;
  productId: string;
  qty: number;
  product: { name: string };
}

export default function AdminInventoryPage() {
  const [variants, setVariants] = useState<VariantInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const { requestConfirmation } = useConfirmationModal();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: VariantInventory[] }>('GET', '/api/v1/inventory/admin/variants', undefined, { withCredentials: true });
      setVariants(res.items || (res as any));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustStock = async (variant: VariantInventory) => {
    const qtyStr = prompt(`Adjust stock for ${variant.product?.name || variant.sku} (${variant.size} ${variant.color}). Current: ${variant.qty}\n\nEnter new amount to ADD (e.g. 10 to add, -5 to remove):`);
    if (!qtyStr) return;
    
    const qtyAdjustment = parseInt(qtyStr, 10);
    if (isNaN(qtyAdjustment)) return alert("Invalid number");

    const reason = prompt('Please enter a justification for the audit log (RULE 6):');
    if (!reason || reason.trim() === '') {
      return alert('Adjustment cancelled: Reason was mandatory.');
    }

    const confirmed = await requestConfirmation({
      title: 'Confirm Adjustment',
      message: `Adjust stock by ${qtyAdjustment > 0 ? '+' : ''}${qtyAdjustment}? New total will be ${variant.qty + qtyAdjustment}. Reason: "${reason}"`,
      confirmLabel: 'Adjust Stock'
    });

    if (confirmed) {
      try {
        await apiFetch('POST', '/api/v1/inventory/admin/adjust', {
          variantId: variant.id,
          adjustment: qtyAdjustment,
          reason
        }, { withCredentials: true });
        
        loadData(); // Re-fetch
      } catch (err: any) {
        alert(err.message || 'Failed to adjust');
      }
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>;

  return (
    <InventoryAllowed>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Inventory Control</h1>
          <p className="text-gray-400 text-sm mt-1">Manage physical stock quantities across all variants.</p>
        </div>

        <AdminTable
          data={variants}
          globalSearchField="sku"
          searchPlaceholder="Search by SKU..."
          exportFilename="fs_inventory_export.csv"
          columns={[
            { header: 'Product', accessor: (row) => row.product?.name || 'Unknown' },
            { header: 'SKU', accessor: 'sku', sortable: true },
            { header: 'Variant', accessor: (row) => `${row.size} / ${row.color}` },
            { 
              header: 'Quantity Available', 
              accessor: (row) => (
                <span className={`font-medium ${row.qty <= 5 ? 'text-red-400' : 'text-gray-300'}`}>
                  {row.qty}
                </span>
              ), 
              sortable: true 
            },
            {
              header: 'Action',
              accessor: (row) => (
                <button 
                  onClick={() => handleAdjustStock(row)}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-xs rounded border border-gray-700 transition flex items-center gap-2"
                >
                  <ClipboardEdit className="w-3 h-3" /> Adjust
                </button>
              )
            }
          ]}
        />
      </div>
    </InventoryAllowed>
  );
}
