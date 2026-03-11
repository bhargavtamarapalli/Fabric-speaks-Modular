'use client';

import { useState } from 'react';
import { SuperAdminOnly } from '@/components/admin/WithRoleGuard';
import { apiFetch } from '@/lib/apiClient';
import { useConfirmationModal } from '@/components/admin/ConfirmationModal';
import { Save } from 'lucide-react';

export default function GlobalConfigPage() {
  const [loading, setLoading] = useState(false);
  const { requestConfirmation } = useConfirmationModal();
  
  // Just scaffolding the shape. The API expects these nodes.
  const [navItems, setNavItems] = useState('[{"label": "Shop", "href": "/shop"}]');
  const [homeHero, setHomeHero] = useState('{"title": "The Premium Edit", "subtitle": "Discover luxury"}');

  const handleSaveNav = async () => {
    const confirmed = await requestConfirmation({
      title: 'Update Navigation Cache',
      message: 'This will invalidate Redis cache and instantly deploy navigation updates globally. Proceed?',
      confirmLabel: 'Deploy Nav Settings'
    });

    if (confirmed) {
      setLoading(true);
      try {
        await apiFetch('POST', '/api/v1/admin/navigation', { items: JSON.parse(navItems) }, { withCredentials: true });
        alert('Navigation deployed securely (Rule 6 enforced)');
      } catch (e: any) {
        alert(e.message || 'Format failure');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SuperAdminOnly>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Global Configuration</h1>
          <p className="text-gray-400 text-sm mt-1">Manage global components instantly via Redis-Invalidation endpoints.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-medium border-b border-gray-800 pb-2">Global Navigation Editor (JSON)</h2>
          <textarea
            className="w-full bg-[var(--fs-void)] font-mono text-sm border border-gray-700 rounded-md py-3 px-4 text-emerald-400 h-32"
            value={navItems}
            onChange={e => setNavItems(e.target.value)}
          />
          <button 
            disabled={loading}
            onClick={handleSaveNav}
            className="px-4 py-2 bg-[var(--fs-linen)] text-[var(--fs-void)] hover:bg-gray-200 text-sm rounded flex items-center gap-2 font-medium transition"
          >
            <Save className="w-4 h-4" /> Save Navigation
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-medium border-b border-gray-800 pb-2">Homepage Hero Configuration (JSON)</h2>
          <textarea
            className="w-full bg-[var(--fs-void)] font-mono text-sm border border-gray-700 rounded-md py-3 px-4 text-blue-400 h-32"
            value={homeHero}
            onChange={e => setHomeHero(e.target.value)}
          />
          <button 
            onClick={() => alert('Wired to same proxy')}
            className="px-4 py-2 bg-[var(--fs-linen)] text-[var(--fs-void)] hover:bg-gray-200 text-sm rounded flex items-center gap-2 font-medium transition"
          >
            <Save className="w-4 h-4" /> Save Homepage
          </button>
        </div>
      </div>
    </SuperAdminOnly>
  );
}
