'use client';

import { useEffect, useState } from 'react';
import { SuperAdminOnly } from '@/components/admin/WithRoleGuard';
import { AdminTable } from '@/components/admin/AdminTable';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { apiFetch } from '@/lib/apiClient';
import { useConfirmationModal } from '@/components/admin/ConfirmationModal';
import { PenTool } from 'lucide-react';

export default function AdminPagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // For brevity avoiding the full page creation workflow UI modal and keeping the lists solid
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: any[] }>('GET', '/api/v1/admin/pages', undefined, { withCredentials: true });
      setPages(res.items || (res as any));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>;

  return (
    <SuperAdminOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Content Pages (CMS)</h1>
          <p className="text-gray-400 text-sm mt-1">Control /about, /terms, and other static DOMPurify injected pages.</p>
        </div>

        <AdminTable
          data={pages}
          globalSearchField="slug"
          searchPlaceholder="Search slugs..."
          columns={[
            { header: 'Page Title', accessor: 'title' },
            { header: 'Live Address', accessor: (row) => `fabricspeaks.shop/pages/${row.slug}`, sortable: true },
            { 
              header: 'Status', 
              accessor: (row) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  row.isPublished ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900' : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}>
                  {row.isPublished ? 'Live' : 'Hidden'}
                </span>
              ),
              sortable: true
            },
            {
              header: 'Editor',
              accessor: (row) => (
                <button 
                  onClick={() => alert(`Opening Rich Text / DOMPurify editor for ${row.title}`)}
                  className="p-1.5 bg-gray-800 hover:bg-[var(--fs-linen)] hover:text-black rounded transition text-gray-400"
                >
                  <PenTool className="w-4 h-4" />
                </button>
              )
            }
          ]}
        />
      </div>
    </SuperAdminOnly>
  );
}
