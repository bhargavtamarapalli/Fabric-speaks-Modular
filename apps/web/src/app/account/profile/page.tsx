'use client';

import { useEffect, useState, useCallback } from 'react';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { getProfile, updateProfile, UserProfile } from '@/lib/api/customer';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/context/ToastContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getProfile();
      setProfile(res);
    } catch (err: any) {
      if (user) {
        setProfile({
          name: user.name || '',
          email: user.email || '',
          mobile: user.mobile || ''
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      await updateProfile({
        name: profile.name,
        email: profile.email
      });
      setEditMode(false);
      showToast('Profile updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-serif text-[var(--fs-linen)]">Personal Details</h2>
          <p className="text-sm text-gray-400 mt-1">Manage your identity and contact information.</p>
        </div>
        {!editMode && (
          <button 
            onClick={() => setEditMode(true)}
            className="text-sm uppercase tracking-widest text-[var(--fs-linen)] hover:text-white transition"
          >
            Edit
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-[var(--fs-ash)]">Full Name</label>
          <input 
            type="text" 
            disabled={!editMode}
            value={profile.name}
            onChange={e => setProfile({ ...profile, name: e.target.value })}
            className="w-full bg-[var(--fs-void)] border border-[var(--fs-wire)] rounded-sm py-3 px-4 text-sm text-[var(--fs-ivory)] disabled:opacity-60 focus:outline-none focus:border-[var(--fs-linen)] transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-[var(--fs-ash)]">Email Address</label>
          <input 
            type="email" 
            disabled={!editMode}
            value={profile.email}
            onChange={e => setProfile({ ...profile, email: e.target.value })}
            className="w-full bg-[var(--fs-void)] border border-[var(--fs-wire)] rounded-sm py-3 px-4 text-sm text-[var(--fs-ivory)] disabled:opacity-60 focus:outline-none focus:border-[var(--fs-linen)] transition-colors"
          />
        </div>

        <div className="space-y-2 opacity-70">
          <div className="flex justify-between">
            <label className="text-xs uppercase tracking-widest text-[var(--fs-ash)]">Mobile Number</label>
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Verified
            </span>
          </div>
          <input 
            type="text" 
            disabled 
            value={profile.mobile}
            className="w-full bg-[var(--fs-void)] border border-[var(--fs-wire)] rounded-sm py-3 px-4 text-sm text-[var(--fs-ash)] cursor-not-allowed"
          />
          <p className="text-xs text-[var(--fs-ash)] mt-1">Mobile numbers cannot be changed directly for security reasons.</p>
        </div>

        {editMode && (
          <div className="pt-4 flex gap-4">
            <button 
              disabled={saving}
              onClick={handleSave}
              className="px-6 py-3 uppercase tracking-[0.15em] text-xs font-medium bg-[var(--fs-linen)] text-[var(--fs-void)] border border-[var(--fs-linen)] hover:bg-gray-200 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button 
              disabled={saving}
              onClick={() => { setEditMode(false); fetchProfile(); }}
              className="px-6 py-3 uppercase tracking-[0.15em] text-xs font-medium bg-transparent text-[var(--fs-ash)] border border-[var(--fs-wire)] hover:border-gray-500 hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
