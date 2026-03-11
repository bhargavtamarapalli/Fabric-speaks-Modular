'use client';

import { useEffect, useState } from 'react';
import { SuperAdminOnly } from '@/components/admin/WithRoleGuard';
import { AdminTable } from '@/components/admin/AdminTable';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { apiFetch } from '@/lib/apiClient';
import { useConfirmationModal } from '@/components/admin/ConfirmationModal';
import { Plus, ShieldAlert, Trash2 } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { requestConfirmation } = useConfirmationModal();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ items: any[] }>('GET', '/api/v1/admin/users', undefined, { withCredentials: true });
      setUsers(res.items || (res as any));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await requestConfirmation({
      title: 'Revoke Access',
      message: `Are you sure you want to permanently revoke admin panel access for ${name}?`,
      confirmLabel: 'Revoke',
      isDestructive: true
    });

    if (confirmed) {
      try {
        await apiFetch('DELETE', `/api/v1/admin/users/${id}`, undefined, { withCredentials: true });
        loadData();
      } catch (err: any) {
        alert(err.message || 'Deletion failed');
      }
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>;

  return (
    <SuperAdminOnly>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Identity & Access Management</h1>
            <p className="text-gray-400 text-sm mt-1">Manage staff roles and permissions. Changes are logged.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => alert('Opening audit logs module...')} className="px-4 py-2 border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 text-sm rounded flex items-center gap-2 transition">
              <ShieldAlert className="w-4 h-4" /> View Audit Logs
            </button>
            <button onClick={() => alert('Add user API triggered')} className="px-4 py-2 bg-[var(--fs-linen)] text-[var(--fs-void)] hover:bg-gray-200 text-sm rounded flex items-center gap-2 font-medium transition">
              <Plus className="w-4 h-4" /> Provision Account
            </button>
          </div>
        </div>

        <AdminTable
          data={users}
          globalSearchField="name"
          searchPlaceholder="Search staff name..."
          columns={[
            { header: 'Staff Name', accessor: 'name', sortable: true },
            { header: 'Mobile (Login)', accessor: 'mobile' },
            { 
              header: 'Role Access', 
              accessor: (row) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                  row.role === 'superAdmin' ? 'bg-purple-950/30 text-purple-400 border-purple-900' :
                  row.role === 'inventoryManager' ? 'bg-amber-950/30 text-amber-400 border-amber-900' :
                  'bg-blue-950/30 text-blue-400 border-blue-900'
                }`}>
                  {row.role}
                </span>
              ),
              sortable: true
            },
            { header: 'Created', accessor: (row) => new Date(row.createdAt).toLocaleDateString() },
            {
              header: 'Revoke',
              accessor: (row) => (
                <button 
                  onClick={() => handleDelete(row.id, row.name)}
                  className="p-1.5 bg-red-950/20 hover:bg-red-900 text-red-500 rounded transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            }
          ]}
        />
      </div>
    </SuperAdminOnly>
  );
}
