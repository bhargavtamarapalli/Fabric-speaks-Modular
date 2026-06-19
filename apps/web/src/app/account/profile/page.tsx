'use client';
import { useEffect, useState, useCallback } from 'react';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { getProfile, updateProfile, UserProfile } from '@/lib/api/customer';
import { Shield, Loader2, MessageCircle, Mail, Smartphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; mobile?: string }>({});

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  const fetchProfile = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await getProfile(signal);
      setProfile(res);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return;
      if (user) {
        setProfile({
          name: user.name || '',
          email: user.email || '',
          mobile: user.mobile || '',
          whatsapp_enabled: true,
          email_verified: false
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProfile(controller.signal);
    return () => controller.abort();
  }, [fetchProfile]);

  const handleSave = async () => {
    if (!profile) return;
    
    // Validate all fields before save (I5-1)
    const errors: typeof fieldErrors = {};
    if (!profile.name?.trim()) errors.name = 'Name is required';
    else if (profile.name.length < 2) errors.name = 'Name must be at least 2 characters';
    
    if (!profile.email?.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) errors.email = 'Enter a valid email address';
    
    if (profile.mobile && !/^\d{10}$/.test(profile.mobile.replace(/\D/g, ''))) {
      errors.mobile = 'Mobile must be 10 digits';
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast('Please fix the errors below', 'error');
      return;
    }
    
    try {
      setSaving(true);
      await updateProfile({
        name: profile.name,
        email: profile.email,
        mobile: profile.mobile,
        whatsapp_enabled: profile.whatsapp_enabled,
        email_verified: profile.email_verified
      });
      setEditMode(false);
      setFieldErrors({});
      showToast('Profile updated successfully', 'success');
      await refreshUser();
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  // Validate individual field on blur (I5-1)
  const validateField = (field: 'name' | 'email' | 'mobile', value: string) => {
    const errors: typeof fieldErrors = { ...fieldErrors };
    
    if (field === 'name') {
      if (!value?.trim()) errors.name = 'Name is required';
      else if (value.length < 2) errors.name = 'Name must be at least 2 characters';
      else delete errors.name;
    }
    
    if (field === 'email') {
      if (!value?.trim()) errors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.email = 'Enter a valid email address';
      else delete errors.email;
    }
    
    if (field === 'mobile') {
      if (value && !/^\d{10}$/.test(value.replace(/\D/g, ''))) {
        errors.mobile = 'Mobile must be 10 digits';
      } else {
        delete errors.mobile;
      }
    }
    
    setFieldErrors(errors);
  };

  const toggleWhatsapp = async (val: boolean) => {
    if (!profile?.mobile) {
      showToast('Add a mobile number to enable WhatsApp notifications', 'info');
      return;
    }
    setProfile(p => p ? { ...p, whatsapp_enabled: val } : null);
    try {
      await updateProfile({ whatsapp_enabled: val });
      showToast(`WhatsApp notifications ${val ? 'enabled' : 'disabled'}`, 'success');
    } catch (err: any) {
      showToast('Failed to update preferences', 'error');
      setProfile(p => p ? { ...p, whatsapp_enabled: !val } : null);
    }
  };

  const handlePasswordChange = async () => {
    if (pwForm.new !== pwForm.confirm) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (pwForm.new.length < 8) {
      showToast('New password must be at least 8 characters', 'error');
      return;
    }

    try {
      setPwLoading(true);
      const { apiFetch } = await import('@/lib/apiClient');
      await apiFetch('/auth/customer/change-password', {
        method: 'PATCH',
        data: {
          currentPassword: pwForm.current,
          newPassword: pwForm.new
        }
      });
      showToast('Password updated successfully', 'success');
      setIsChangingPassword(false);
      setPwForm({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading || !profile) {
    return <div className="py-20 flex justify-center"><SpiderLoader size="md" color="var(--fs-linen)" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-12 pb-20">
      <header className="space-y-2">
        <h1 className="text-4xl font-serif text-[var(--fs-ivory)]">Account Settings</h1>
        <p className="text-[var(--fs-ash)] text-lg">Manage your personal information and preferences.</p>
      </header>

      <section className="space-y-8 bg-[var(--fs-surface)] p-8 rounded-2xl border border-[var(--fs-wire)]">
        <div className="flex justify-between items-center border-b border-[var(--fs-wire)] pb-4">
          <h2 className="text-xl font-serif text-[var(--fs-linen)]">Personal Profile</h2>
          {!editMode && (
            <button 
              onClick={() => setEditMode(true)}
              className="px-4 py-1.5 text-xs uppercase tracking-widest bg-[var(--fs-surface-2)] text-[var(--fs-linen)] border border-[var(--fs-wire)] rounded-full hover:border-[var(--fs-linen)] transition"
            >
              Edit Details
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-[var(--fs-ash)] font-bold">Full Name</label>
            <div className="relative">
              <input 
                type="text" 
                disabled={!editMode}
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
                onBlur={() => validateField('name', profile.name)}
                className={`w-full bg-[var(--fs-surface-2)] border rounded-lg py-3 px-4 text-sm text-[var(--fs-ivory)] disabled:opacity-50 focus:outline-none transition ${
                  fieldErrors.name ? 'border-red-500' : 'border-[var(--fs-wire)] focus:border-[var(--fs-linen)]'
                }`}
              />
              {fieldErrors.name && (
                <p className="text-[10px] text-red-500 mt-1">{fieldErrors.name}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-[10px] uppercase tracking-widest text-[var(--fs-ash)] font-bold">Email Address</label>
              {profile.email_verified ? (
                <span className="text-[10px] text-[var(--fs-success)] flex items-center gap-1 uppercase tracking-tighter">
                  <Shield className="w-2.5 h-2.5" /> Verified
                </span>
              ) : (
                <button className="text-[10px] text-amber-500 hover:underline uppercase tracking-tighter">Verify Now</button>
              )}
            </div>
            <div>
              <input 
                type="email" 
                disabled={!editMode}
                value={profile.email}
                onChange={e => setProfile({ ...profile, email: e.target.value })}
                onBlur={() => validateField('email', profile.email)}
                className={`w-full bg-[var(--fs-surface-2)] border rounded-lg py-3 px-4 text-sm text-[var(--fs-ivory)] disabled:opacity-50 focus:outline-none transition ${
                  fieldErrors.email ? 'border-red-500' : 'border-[var(--fs-wire)] focus:border-[var(--fs-linen)]'
                }`}
              />
              {fieldErrors.email && (
                <p className="text-[10px] text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-[10px] uppercase tracking-widest text-[var(--fs-ash)] font-bold">Mobile Number</label>
              {profile.mobile?.length === 10 && (
                <span className="text-[10px] text-[var(--fs-success)] flex items-center gap-1 uppercase tracking-tighter">
                  <Shield className="w-2.5 h-2.5" /> Verified
                </span>
              )}
            </div>
            <div>
              <input 
                type="tel" 
                disabled={!editMode}
                value={profile.mobile}
                placeholder={!profile.mobile ? "Add mobile number" : ""}
                onChange={e => setProfile({ ...profile, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                onBlur={() => validateField('mobile', profile.mobile)}
                className={`w-full bg-[var(--fs-surface-2)] border rounded-lg py-3 px-4 text-sm text-[var(--fs-ivory)] disabled:opacity-50 focus:outline-none transition ${
                  fieldErrors.mobile ? 'border-red-500' : (
                    !profile.mobile && editMode ? 'border-dashed border-[var(--fs-wire)]' : 'border-[var(--fs-wire)] focus:border-[var(--fs-linen)]'
                  )
                }`}
              />
              {fieldErrors.mobile && (
                <p className="text-[10px] text-red-500 mt-1">{fieldErrors.mobile}</p>
              )}
            </div>
            {!profile.mobile && (
              <p className="text-[10px] text-amber-500 mt-1 italic">Adding a mobile number enables WhatsApp notifications.</p>
            )}
          </div>
        </div>

        {editMode && (
          <div className="pt-4 flex gap-4">
            <button 
              disabled={saving}
              onClick={handleSave}
              className="px-8 py-3 bg-[var(--fs-linen)] text-[var(--fs-void)] text-xs uppercase tracking-widest font-bold rounded-lg hover:bg-[var(--fs-linen-dk)] transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Profile'}
            </button>
            <button 
              disabled={saving}
              onClick={() => { setEditMode(false); fetchProfile(); }}
              className="px-8 py-3 bg-transparent text-[var(--fs-ash)] border border-[var(--fs-wire)] text-xs uppercase tracking-widest font-bold rounded-lg hover:border-[var(--fs-ivory)] hover:text-[var(--fs-ivory)] transition"
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      <section className="space-y-8 bg-[var(--fs-surface)] p-8 rounded-2xl border border-[var(--fs-wire)]">
        <h2 className="text-xl font-serif text-[var(--fs-linen)] border-b border-[var(--fs-wire)] pb-4">Security</h2>
        <div className="max-w-md space-y-6">
           <div className="space-y-1">
              <h3 className="text-[var(--fs-ivory)] font-medium">Password</h3>
              <p className="text-xs text-[var(--fs-ash)]">Change your account password regularly to keep your account secure.</p>
           </div>
           
           {!isChangingPassword ? (
             <button 
               onClick={() => setIsChangingPassword(true)}
               className="px-6 py-2 bg-[var(--fs-surface-2)] text-[var(--fs-linen)] border border-[var(--fs-wire)] text-[10px] uppercase tracking-widest font-bold rounded-full hover:border-[var(--fs-linen)] transition"
             >
               Change Password
             </button>
           ) : (
             <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                   <label className="text-[10px] uppercase tracking-widest text-[var(--fs-ash)] font-bold">Current Password</label>
                   <input 
                     type="password" 
                     value={pwForm.current}
                     onChange={e => setPwForm({...pwForm, current: e.target.value})}
                     className="w-full bg-[var(--fs-surface-2)] border border-[var(--fs-wire)] rounded-lg py-2.5 px-4 text-sm text-[var(--fs-ivory)] focus:border-[var(--fs-linen)] outline-none transition"
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] uppercase tracking-widest text-[var(--fs-ash)] font-bold">New Password</label>
                   <input 
                     type="password" 
                     value={pwForm.new}
                     onChange={e => setPwForm({...pwForm, new: e.target.value})}
                     className="w-full bg-[var(--fs-surface-2)] border border-[var(--fs-wire)] rounded-lg py-2.5 px-4 text-sm text-[var(--fs-ivory)] focus:border-[var(--fs-linen)] outline-none transition"
                   />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] uppercase tracking-widest text-[var(--fs-ash)] font-bold">Confirm New Password</label>
                   <input 
                     type="password" 
                     value={pwForm.confirm}
                     onChange={e => setPwForm({...pwForm, confirm: e.target.value})}
                     className="w-full bg-[var(--fs-surface-2)] border border-[var(--fs-wire)] rounded-lg py-2.5 px-4 text-sm text-[var(--fs-ivory)] focus:border-[var(--fs-linen)] outline-none transition"
                   />
                </div>
                <div className="flex gap-3 pt-2">
                   <button 
                     disabled={pwLoading}
                     onClick={handlePasswordChange}
                     className="px-6 py-2 bg-[var(--fs-linen)] text-[var(--fs-void)] text-[10px] uppercase tracking-widest font-bold rounded-lg hover:bg-[var(--fs-linen-dk)] transition disabled:opacity-50"
                   >
                     {pwLoading ? 'Updating...' : 'Update Password'}
                   </button>
                   <button 
                     disabled={pwLoading}
                     onClick={() => setIsChangingPassword(false)}
                     className="px-6 py-2 bg-transparent text-[var(--fs-ash)] text-[10px] uppercase tracking-widest font-bold border border-[var(--fs-wire)] rounded-lg hover:border-[var(--fs-ivory)] transition"
                   >
                     Cancel
                   </button>
                </div>
             </div>
           )}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-serif text-[var(--fs-linen)] border-b border-[var(--fs-wire)] pb-4">Communication Preferences</h2>
        
        <div className="grid grid-cols-1 gap-4">
          <div className={`p-6 rounded-2xl border transition-all flex items-center justify-between ${profile.mobile ? 'bg-[var(--fs-surface)] border-[var(--fs-wire)]' : 'bg-[var(--fs-surface)]/40 border-[var(--fs-wire)] opacity-60'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${profile.mobile ? 'bg-[var(--fs-linen)]/10 text-[var(--fs-linen)]' : 'bg-gray-800 text-gray-500'}`}>
                <MessageCircle size={24} />
              </div>
              <div>
                <h3 className="font-medium text-[var(--fs-ivory)]">WhatsApp Notifications</h3>
                <p className="text-xs text-[var(--fs-ash)] mt-0.5">Order updates, tracking links, and early access via WhatsApp.</p>
              </div>
            </div>
            
            <button
              onClick={() => toggleWhatsapp(!profile.whatsapp_enabled)}
              disabled={!profile.mobile}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${profile.whatsapp_enabled && profile.mobile ? 'bg-[var(--fs-linen)]' : 'bg-gray-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profile.whatsapp_enabled && profile.mobile ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--fs-surface)] border border-[var(--fs-wire)] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-[var(--fs-linen)]/10 text-[var(--fs-linen)]">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="font-medium text-[var(--fs-ivory)]">SMS Notifications</h3>
                <p className="text-xs text-[var(--fs-ash)] mt-0.5">Essential order status and delivery alerts via SMS.</p>
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--fs-linen)] font-bold bg-[var(--fs-linen)]/10 px-3 py-1 rounded-full border border-[var(--fs-linen)]/20">Always On</div>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--fs-surface)] border border-[var(--fs-wire)] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-[var(--fs-linen)]/10 text-[var(--fs-linen)]">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="font-medium text-[var(--fs-ivory)]">Email Updates</h3>
                <p className="text-xs text-[var(--fs-ash)] mt-0.5">Invoices, newsletters, and personalized recommendations.</p>
              </div>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--fs-linen)] font-bold bg-[var(--fs-linen)]/10 px-3 py-1 rounded-full border border-[var(--fs-linen)]/20">Always On</div>
          </div>
        </div>
      </section>
    </div>
  );
}
