'use client';

import { useEffect, useState } from 'react';
import { InventoryAllowed } from '@/components/admin/WithRoleGuard';
import { AdminTable } from '@/components/admin/AdminTable';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { apiFetch } from '@/lib/apiClient';
import { Plus } from 'lucide-react';
import { useConfirmationModal } from '@/components/admin/ConfirmationModal';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { requestConfirmation } = useConfirmationModal();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: Category[] }>('GET', '/api/v1/catalog/admin/categories', undefined, { withCredentials: true });
      setCategories(res.items || (res as any));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    const name = prompt('Enter Category Name:');
    if (!name) return;
    
    const confirmed = await requestConfirmation({
      title: 'Create Category',
      message: `Creating new system category: ${name}. This taxonomy will be immediately visible for product assignments.`,
      confirmLabel: 'Create'
    });

    if (confirmed) {
      try {
        await apiFetch('POST', '/api/v1/catalog/admin/categories', {
          name, 
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: `Category for ${name}`
        }, { withCredentials: true });
        loadData();
      } catch (err: any) {
        alert(err.message || 'Creation failed');
      }
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>;

  return (
    <InventoryAllowed>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Taxonomy & Categories</h1>
            <p className="text-gray-400 text-sm mt-1">Manage global product classification layers.</p>
          </div>
          <button 
            onClick={handleCreate}
            className="px-4 py-2 bg-[var(--fs-linen)] text-[var(--fs-void)] hover:bg-gray-200 text-sm rounded flex items-center gap-2 font-medium transition"
          >
            <Plus className="w-4 h-4" /> New Category
          </button>
        </div>

        <AdminTable
          data={categories}
          globalSearchField="name"
          searchPlaceholder="Search taxonomies..."
          columns={[
            { header: 'ID', accessor: 'id' },
            { header: 'Name', accessor: 'name', sortable: true },
            { header: 'URL Slug', accessor: 'slug' },
            { header: 'Description', accessor: (row) => row.description || '-' },
          ]}
        />
      </div>
    </InventoryAllowed>
  );
}
