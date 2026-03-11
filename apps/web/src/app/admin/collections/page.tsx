'use client';

import { useEffect, useState } from 'react';
import { InventoryAllowed } from '@/components/admin/WithRoleGuard';
import { AdminTable } from '@/components/admin/AdminTable';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { apiFetch } from '@/lib/apiClient';
import { Plus, GripVertical } from 'lucide-react';
import { useConfirmationModal } from '@/components/admin/ConfirmationModal';

interface Collection {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  priority: number;
}

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const { requestConfirmation } = useConfirmationModal();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: Collection[] }>('GET', '/api/v1/catalog/admin/collections', undefined, { withCredentials: true });
      setCollections(res.items || (res as any));
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
    const name = prompt('Collection Title:');
    if (!name) return;
    
    const confirmed = await requestConfirmation({
      title: 'Draft Collection',
      message: `Create a draft curation titled '${name}'?`,
      confirmLabel: 'Create Outline'
    });

    if (confirmed) {
      try {
        await apiFetch('POST', '/api/v1/catalog/admin/collections', {
          name, 
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          isActive: false,
          priority: 0
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
            <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Curated Collections</h1>
            <p className="text-gray-400 text-sm mt-1">Group products into editorial drops and rank them.</p>
          </div>
          <button 
            onClick={handleCreate}
            className="px-4 py-2 bg-[var(--fs-linen)] text-[var(--fs-void)] hover:bg-gray-200 text-sm rounded flex items-center gap-2 font-medium transition"
          >
            <Plus className="w-4 h-4" /> Outline Collection
          </button>
        </div>

        <AdminTable
          data={collections}
          globalSearchField="name"
          searchPlaceholder="Search curations..."
          columns={[
            { header: 'Drag', accessor: () => <GripVertical className="w-4 h-4 text-gray-600 cursor-move" /> },
            { header: 'Priority Layer', accessor: 'priority', sortable: true },
            { header: 'Collection Name', accessor: 'name', sortable: true },
            { header: 'Slug Path', accessor: (row) => `/collections/${row.slug}` },
            { 
              header: 'Status', 
              accessor: (row) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  row.isActive ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900' : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}>
                  {row.isActive ? 'Published' : 'Draft Outline'}
                </span>
              ),
              sortable: true
            },
          ]}
        />
      </div>
    </InventoryAllowed>
  );
}
