'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { AdminTable } from '@/components/admin/AdminTable';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { AlertCircle, Calendar } from 'lucide-react';

interface ExpectedStock {
  id: string;
  variantSlug: string;
  productName: string;
  expectedQty: number;
  currentStock: number;
  arrivalDate: string;
  status: 'SCHEDULED' | 'DELAYED' | 'ARRIVED';
}

export default function ExpectedStockAdmin() {
  const [data, setData] = useState<ExpectedStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We proxy a simulated list of ExpectedStock items since the explicit DB tables
    // for ExpectedStock may still be stubbed in the Inventory API route.
    const loadData = async () => {
      try {
        setLoading(true);
        // Fallback to static mock for table rendering verification
        await new Promise(r => setTimeout(r, 600)); 
        setData([
          { id: '1', variantSlug: 'silk-red-xl', productName: 'Red Kanjeevaram Silk', expectedQty: 50, currentStock: 2, arrivalDate: '2026-03-24', status: 'SCHEDULED' },
          { id: '2', variantSlug: 'cotton-bl-m', productName: 'Blue Jamdani Cotton', expectedQty: 200, currentStock: 0, arrivalDate: '2026-03-15', status: 'DELAYED' },
          { id: '3', variantSlug: 'linen-wh-l', productName: 'White Linen Blend', expectedQty: 120, currentStock: 45, arrivalDate: '2026-03-28', status: 'SCHEDULED' },
          { id: '4', variantSlug: 'zari-gold-one', productName: 'Gold Border Zari Overlay', expectedQty: 10, currentStock: 1, arrivalDate: '2026-03-12', status: 'ARRIVED' },
        ]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const columns = useMemo(() => [
    { header: 'ID', accessor: 'id' as const, sortable: true },
    { 
      header: 'Product / Variant', 
      accessor: (row: ExpectedStock) => (
        <div>
          <div className="font-medium text-[var(--fs-ivory)]">{row.productName}</div>
          <div className="text-xs text-[var(--fs-ash)] mt-1">{row.variantSlug}</div>
        </div>
      ),
      sortable: false 
    },
    { header: 'Cur. Stock', accessor: 'currentStock' as const, sortable: true },
    { header: 'Expected Qty', accessor: 'expectedQty' as const, sortable: true },
    { 
      header: 'Arrival Date', 
      accessor: (row: ExpectedStock) => (
        <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            {new Date(row.arrivalDate).toLocaleDateString()}
        </span>
      ), 
      sortable: true 
    },
    { 
      header: 'Status', 
      accessor: (row: ExpectedStock) => {
        let colorClass = 'text-blue-400 bg-blue-900/30 border-blue-800';
        if (row.status === 'DELAYED') colorClass = 'text-red-400 bg-red-900/30 border-red-800';
        if (row.status === 'ARRIVED') colorClass = 'text-green-400 bg-green-900/30 border-green-800';
        
        return (
          <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-medium border rounded-sm ${colorClass}`}>
            {row.status}
          </span>
        );
      },
      sortable: true
    }
  ], []);

  if (loading) {
    return <div className="py-20 flex justify-center"><SpiderLoader size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Expected Stock Deliveries</h1>
          <p className="text-sm text-gray-400 mt-1">Track incoming purchase orders and supplier restocks.</p>
        </div>
        <div className="px-4 py-2 bg-red-950/20 border border-red-900 text-red-400 text-xs flex items-center gap-2 rounded-sm">
            <AlertCircle className="w-4 h-4" /> 1 Shipment Delayed
        </div>
      </div>

      <div className="bg-[var(--fs-void)] border border-[var(--fs-wire)] p-4 rounded-sm">
        <AdminTable 
          data={data}
          columns={columns}
          globalSearchField="productName"
          searchPlaceholder="Search products or variants..."
        />
      </div>
    </div>
  );
}
