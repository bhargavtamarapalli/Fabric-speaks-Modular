'use client';

import { useEffect, useState } from 'react';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { apiFetch } from '@/lib/apiClient';

interface Preferences {
  orderUpdatesWhatsApp: boolean;
  orderUpdatesSms: boolean;
  orderUpdatesEmail: boolean;
  promotionsWhatsApp: boolean;
  promotionsSms: boolean;
  promotionsEmail: boolean;
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Initial fetch of preferences
    apiFetch<Preferences>('/customer/preferences')
      .then(res => setPrefs(res as any))
      .catch(() => {
        // Fallback default state
        setPrefs({
          orderUpdatesWhatsApp: true,
          orderUpdatesSms: true,
          orderUpdatesEmail: true,
          promotionsWhatsApp: false,
          promotionsSms: false,
          promotionsEmail: true
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key: keyof Preferences) => {
    if (!prefs) return;
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    
    // Optistic update async
    try {
      setSaving(true);
      await apiFetch('/customer/preferences', {
        method: 'PATCH',
        data: newPrefs
      });
    } catch (err) {
      // Revert if API fails
      setPrefs({ ...prefs });
      alert('Failed to update preference');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) {
    return <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>;
  }

  const ToggleRow = ({ label, prop }: { label: string, prop: keyof Preferences }) => (
    <div className="flex items-center justify-between py-4 border-b border-[var(--fs-wire)] last:border-0">
      <span className="text-sm text-[var(--fs-ivory)]">{label}</span>
      <button 
        onClick={() => handleToggle(prop)}
        disabled={saving}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          prefs[prop] ? 'bg-[var(--fs-linen)]' : 'bg-gray-700'
        }`}
      >
        <span 
          className={`absolute top-1 left-1 bg-[var(--fs-void)] w-4 h-4 rounded-full transition-transform ${
            prefs[prop] ? 'translate-x-5' : 'translate-x-0'
          }`} 
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-serif text-[var(--fs-linen)]">Notification Preferences</h2>
        <p className="text-sm text-gray-400 mt-1">Control how and where we contact you.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-[var(--fs-void)] border border-[var(--fs-wire)] rounded-sm p-6">
          <h3 className="text-xs uppercase tracking-widest text-[var(--fs-ash)] mb-4">Transactional Updates</h3>
          <p className="text-sm text-gray-500 mb-6">Critical alerts regarding your orders, shipping, and returns.</p>
          <div className="space-y-1">
            <ToggleRow label="WhatsApp Messages" prop="orderUpdatesWhatsApp" />
            <ToggleRow label="SMS Text Messages" prop="orderUpdatesSms" />
            <ToggleRow label="Email Notifications" prop="orderUpdatesEmail" />
          </div>
        </div>

        <div className="bg-[var(--fs-void)] border border-[var(--fs-wire)] rounded-sm p-6">
          <h3 className="text-xs uppercase tracking-widest text-[var(--fs-ash)] mb-4">Marketing & Promotions</h3>
          <p className="text-sm text-gray-500 mb-6">Updates on new collections, exclusive sales, and drops.</p>
          <div className="space-y-1">
            <ToggleRow label="WhatsApp Broadcasts" prop="promotionsWhatsApp" />
            <ToggleRow label="SMS Text Broadcasts" prop="promotionsSms" />
            <ToggleRow label="Email Newsletters" prop="promotionsEmail" />
          </div>
        </div>
      </div>
    </div>
  );
}
