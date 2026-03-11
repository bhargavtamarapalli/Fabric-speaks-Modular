'use client';

import { useEffect, useState } from 'react';
import { InventoryAllowed } from '@/components/admin/WithRoleGuard';
import { AdminTable } from '@/components/admin/AdminTable';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { apiFetch } from '@/lib/apiClient';
import Link from 'next/link';
import { Edit, Plus, Upload } from 'lucide-react';
import { useConfirmationModal } from '@/components/admin/ConfirmationModal';

interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  fabricType: string;
  category: { name: string } | null;
  basePrice: number;
  isActive: boolean;
  totalStock: number;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { requestConfirmation } = useConfirmationModal();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: AdminProduct[] }>('GET', '/api/v1/catalog/admin/products', undefined, { withCredentials: true });
      // Depending on the exact response shape
      setProducts(res.items || (res as any));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const confirmed = await requestConfirmation({
        title: 'Upload Bulk Variants',
        message: `Are you sure you want to upload variants from ${file.name}? This action will enqueue a background processing job.`,
        confirmLabel: 'Upload CSV'
      });

      if (confirmed) {
        const formData = new FormData();
        formData.append('file', file);
        try {
          // Native fetch for multipart
          const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL || ''}/api/v1/catalog/admin/bulk-variants`, {
            method: 'POST',
            body: formData,
            credentials: 'query' // or include if supported
          });
          if (res.ok) {
            alert('Upload successfully enqueued!');
          } else {
            alert('Failed to upload.');
          }
        } catch (e) {
          alert('Error uploading file');
        }
      }
    };
    fileInput.click();
  };

  if (loading) return <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>;

  return (
    <InventoryAllowed>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Products Catalog</h1>
            <p className="text-gray-400 text-sm mt-1">Manage store products, variants, and fabric properties.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBulkUpload}
              className="px-4 py-2 border border-gray-700 bg-gray-900 hover:bg-gray-800 text-sm rounded flex items-center gap-2 transition"
            >
              <Upload className="w-4 h-4" /> Bulk Upload Variants
            </button>
            <Link 
              href="/admin/products/new"
              className="px-4 py-2 bg-[var(--fs-linen)] text-[var(--fs-void)] hover:bg-gray-200 text-sm rounded flex items-center gap-2 font-medium transition"
            >
              <Plus className="w-4 h-4" /> Add Product
            </Link>
          </div>
        </div>

        <AdminTable
          data={products}
          globalSearchField="name"
          searchPlaceholder="Search product name..."
          exportFilename="fs_products_export.csv"
          columns={[
            { header: 'Product Name', accessor: 'name', sortable: true },
            { header: 'Fabric Type', accessor: 'fabricType', sortable: true },
            { header: 'Category', accessor: (row) => row.category?.name || 'Uncategorized' },
            { header: 'Base Price', accessor: (row) => `₹${row.basePrice}`, sortable: true },
            { header: 'Stock Count', accessor: (row) => row.totalStock ?? 'Varied' },
            { 
              header: 'Status', 
              accessor: (row) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  row.isActive ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900' : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}>
                  {row.isActive ? 'Active' : 'Draft'}
                </span>
              ),
              sortable: true
            },
            {
              header: 'Action',
              accessor: (row) => (
                <Link 
                  href={`/admin/products/${row.id}`} 
                  className="text-gray-400 hover:text-[var(--fs-linen)] flex items-center gap-1 text-sm transition"
                >
                  <Edit className="w-4 h-4" /> Edit
                </Link>
              )
            }
          ]}
        />
      </div>
    </InventoryAllowed>
  );
}
