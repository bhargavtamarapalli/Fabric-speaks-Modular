'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { authApi as profileApi } from '@/lib/authApi';
import { THEME } from '@/lib/admin/theme';
import {
  ActionButton,
  ConfirmModal,
  ErrorBanner,
  FormField,
  PageHeader,
  SectionCard,
  TextInput,
  useToast,
} from '@/components/admin/shared';
import { mapError } from '@/lib/admin/errors';
import { useAdminAuth } from '@/context/AdminAuthContext';

type AdminProfile = {
  name: string;
  email: string;
  mobile: string;
  whatsapp_enabled: boolean;
  preferences?: {
    dateFormat?: string;
    timezone?: string;
    currency?: string;
    sidebarCollapsed?: boolean;
  };
  role?: string;
};

const EMPTY_PROFILE: AdminProfile = {
  name: '',
  email: '',
  mobile: '',
  whatsapp_enabled: false,
  preferences: {
    dateFormat: 'DD/MM/YYYY',
    timezone: 'UTC',
    currency: 'INR',
    sidebarCollapsed: false,
  },
};

const INITIAL_PASSWORD_STATE = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

type Session = {
  id: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  ipAddress?: string;
};

const DATE_FORMATS = [
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
  { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
];

const CURRENCIES = [
  { label: 'INR (₹)', value: 'INR' },
  { label: 'USD ($)', value: 'USD' },
  { label: 'EUR (€)', value: 'EUR' },
];

/**
 * Shared Role Badge for visual consistency
 */
function RoleBadge({ role }: { role: string | null | undefined }) {
  const displayRole = role ? role.replace(/_/g, ' ') : '...';
  return (
    <div style={{
      display: 'inline-block',
      padding: '6px 12px',
      background: 'rgba(201,169,110,0.1)',
      border: `1px solid ${THEME.colors.linen}40`,
      borderRadius: THEME.radius.sm,
      color: THEME.colors.linen,
      fontWeight: 600,
      fontSize: THEME.fontSizes.sm,
      textTransform: 'uppercase'
    }}>
      {displayRole}
    </div>
  );
}

export default function AdminProfilePage() {
  const { role: authRole, loading: authLoading, logout } = useAdminAuth();
  const { showToast, ToastComponent } = useToast();
  const [profile, setProfile] = useState<AdminProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AdminProfile, string>>>({});

  // Session & Audit states
  const [sessions, setSessions] = useState<Session[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  
  // Visibility states
  const [showActivity, setShowActivity] = useState(false);
  const [showSessions, setShowSessions] = useState(false);

  // Password state
  const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD_STATE);
  const [passwordErrors, setPasswordErrors] = useState<Partial<typeof INITIAL_PASSWORD_STATE>>({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);

  // Use DB role if auth claim is still hydrating
  const effectiveRole = authRole || profile.role;

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await profileApi.get();
      setProfile({
        name: data?.name?.trim() || '',
        email: data?.email?.trim() || '',
        mobile: data?.mobile?.trim() || '',
        whatsapp_enabled: Boolean(data?.whatsapp_enabled),
        role: data?.role,
        preferences: {
          ...EMPTY_PROFILE.preferences,
          ...(data?.preferences || {}),
        },
      });
    } catch (e: unknown) {
      setError(mapError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    if (!showSessions) return;
    try {
      setSessionsLoading(true);
      const res = await profileApi.getSessions();
      setSessions(res.sessions || []);
    } catch (e) {
      console.error('Failed to load sessions', e);
    } finally {
      setSessionsLoading(false);
    }
  }, [showSessions]);

  const loadAuditLogs = useCallback(async () => {
    if (!showActivity) return;
    try {
      setAuditLoading(true);
      const res = await profileApi.getAuditLogs();
      setAuditLogs(res || []);
    } catch (e) {
      console.error('Failed to load audit logs', e);
    } finally {
      setAuditLoading(false);
    }
  }, [showActivity]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const validate = () => {
    const next: Partial<Record<keyof AdminProfile, string>> = {};
    if (!profile.name.trim()) next.name = 'Name is required';
    if (!profile.email.trim()) next.email = 'Email is required';
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) next.email = 'Enter a valid email address';
    if (profile.mobile && !/^\d{10}$/.test(profile.mobile.replace(/\D/g, ''))) next.mobile = 'Enter a valid phone number';
    return next;
  };

  const handleSave = async (preferencesOnly = false) => {
    const validationErrors = validate();
    if (!preferencesOnly && Object.values(validationErrors).some(Boolean)) {
      setFieldErrors(validationErrors);
      return;
    }

    try {
      setSaving(true);
      await profileApi.update({
        name: profile.name.trim(),
        email: profile.email.trim(),
        mobile: profile.mobile.trim() || null,
        whatsapp_enabled: profile.whatsapp_enabled,
        preferences: profile.preferences,
      });
      showToast(preferencesOnly ? 'Settings updated' : 'Profile updated successfully', 'success');
      setFieldErrors({});
      if (!preferencesOnly) await loadProfile();
    } catch (e: unknown) {
      showToast(mapError(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeOthers = async () => {
    try {
      setSaving(true);
      await profileApi.revokeOthers();
      showToast('All other sessions revoked', 'success');
      setRevokeModalOpen(false);
      await loadSessions();
    } catch (e: unknown) {
      showToast(mapError(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const validatePassword = () => {
    const next: Partial<typeof INITIAL_PASSWORD_STATE> = {};
    
    if (!passwordForm.currentPassword) {
      next.currentPassword = 'Current password is required';
    }
    
    if (!passwordForm.newPassword) {
      next.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      next.newPassword = 'Must be at least 8 characters';
    }
    
    if (passwordForm.newPassword && passwordForm.newPassword !== passwordForm.confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }
    
    return next;
  };

  const handlePasswordChange = async () => {
    const errors = validatePassword();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      setPasswordLoading(true);
      await profileApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showToast('Password updated successfully', 'success');
      setPasswordForm(INITIAL_PASSWORD_STATE);
      setPasswordErrors({});
    } catch (e: unknown) {
      showToast(mapError(e), 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (e: unknown) {
      showToast(mapError(e), 'error');
    }
  };

  const updateField = <K extends keyof AdminProfile>(key: K, value: AdminProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const updatePreference = (key: keyof NonNullable<AdminProfile['preferences']>, value: any) => {
    setProfile(prev => ({
      ...prev,
      preferences: {
        ...(prev.preferences || {}),
        [key]: value
      }
    }));
  };

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal details, sessions, and dashboard preferences"
      />

      {error && (
        <div style={{ marginBottom: THEME.spacing.md }}>
          <ErrorBanner message={error} onRetry={loadProfile} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: THEME.spacing.lg, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: THEME.spacing.lg }}>
          {/* Main Profile Info */}
          <SectionCard title="Personal Information">
            <div style={{ display: 'grid', gap: THEME.spacing.md }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: THEME.spacing.md }}>
                <FormField label="Full name" required error={fieldErrors.name}>
                  <TextInput
                    value={profile.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Enter full name"
                    disabled={loading || saving}
                  />
                </FormField>

                <FormField label="Email" required error={fieldErrors.email}>
                  <TextInput
                    type="email"
                    value={profile.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="name@company.com"
                    disabled={loading || saving}
                  />
                </FormField>
              </div>

              <FormField label="Mobile number" helper="Primary contact for administrative alerts" error={fieldErrors.mobile}>
                <TextInput
                  type="tel"
                  value={profile.mobile}
                  onChange={(e) => updateField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  disabled={loading || saving}
                />
              </FormField>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: `1px solid ${THEME.colors.border}`,
                  borderRadius: THEME.radius.md,
                  padding: THEME.spacing.md,
                  background: THEME.colors.surface2,
                }}
              >
                <div>
                  <div style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.base, fontWeight: 500 }}>
                    WhatsApp Notifications
                  </div>
                  <div style={{ color: THEME.colors.muted, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.sm }}>
                    Get real-time updates on critical system events
                  </div>
                </div>
                <input
                  type="checkbox"
                  style={{ transform: 'scale(1.2)' }}
                  checked={profile.whatsapp_enabled}
                  onChange={(e) => updateField('whatsapp_enabled', e.target.checked)}
                  disabled={loading || saving || !profile.mobile}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: THEME.spacing.sm }}>
                <ActionButton variant="ghost" onClick={loadProfile} disabled={loading || saving}>
                  Reset
                </ActionButton>
                <ActionButton onClick={() => handleSave(false)} loading={saving} disabled={loading}>
                  Save Profile Changes
                </ActionButton>
              </div>
            </div>
          </SectionCard>

          {/* Regional & UI Settings */}
          <SectionCard title="UI & Regional Settings">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: THEME.spacing.md }}>
              <FormField label="Date Format">
                <select 
                  value={profile.preferences?.dateFormat}
                  onChange={(e) => updatePreference('dateFormat', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: THEME.colors.surface2,
                    border: `1px solid ${THEME.colors.border}`,
                    borderRadius: THEME.radius.md,
                    color: THEME.colors.ivory
                  }}
                >
                  {DATE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </FormField>
              <FormField label="Preferred Currency">
                <select 
                  value={profile.preferences?.currency}
                  onChange={(e) => updatePreference('currency', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: THEME.colors.surface2,
                    border: `1px solid ${THEME.colors.border}`,
                    borderRadius: THEME.radius.md,
                    color: THEME.colors.ivory
                  }}
                >
                  {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </FormField>
            </div>
            <div style={{ marginTop: THEME.spacing.md, display: 'flex', alignItems: 'center', gap: THEME.spacing.md }}>
               <label style={{ display: 'flex', alignItems: 'center', gap: THEME.spacing.sm, cursor: 'pointer', color: THEME.colors.ivory }}>
                  <input 
                    type="checkbox" 
                    checked={profile.preferences?.sidebarCollapsed} 
                    onChange={(e) => updatePreference('sidebarCollapsed', e.target.checked)}
                  />
                  Sidebar collapsed by default
               </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: THEME.spacing.md }}>
                <ActionButton variant="ghost" onClick={() => handleSave(true)} loading={saving}>
                  Apply Settings
                </ActionButton>
            </div>
          </SectionCard>

          {/* Security / Password section */}
          <SectionCard title="Update Password">
            <div style={{ display: 'grid', gap: THEME.spacing.md }}>
              <FormField label="Current password" required error={passwordErrors.currentPassword}>
                <TextInput
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => {
                    setPasswordForm(p => ({ ...p, currentPassword: e.target.value }));
                    setPasswordErrors(p => ({ ...p, currentPassword: '' }));
                  }}
                  placeholder="••••••••"
                  disabled={passwordLoading}
                />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: THEME.spacing.md }}>
                <FormField label="New password" required error={passwordErrors.newPassword}>
                  <TextInput
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => {
                      setPasswordForm(p => ({ ...p, newPassword: e.target.value }));
                      setPasswordErrors(p => ({ ...p, newPassword: '' }));
                    }}
                    placeholder="••••••••"
                    disabled={passwordLoading}
                  />
                </FormField>
                <FormField label="Confirm new password" required error={passwordErrors.confirmPassword}>
                  <TextInput
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => {
                      setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }));
                      setPasswordErrors(p => ({ ...p, confirmPassword: '' }));
                    }}
                    placeholder="••••••••"
                    disabled={passwordLoading}
                  />
                </FormField>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <ActionButton onClick={handlePasswordChange} loading={passwordLoading} disabled={loading}>
                  Update Password
                </ActionButton>
              </div>
            </div>
          </SectionCard>
        </div>

        <div style={{ display: 'grid', gap: THEME.spacing.lg }}>
          {/* Account Meta Section */}
          <SectionCard title="Account Context">
            <div style={{ display: 'grid', gap: THEME.spacing.md }}>
              <div>
                <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Your Permission Level
                </div>
                {authLoading && !effectiveRole ? (
                   <div style={{ height: '32px', width: '120px', background: THEME.colors.surface4, borderRadius: THEME.radius.sm, animation: 'pulse 2s infinite' }} />
                ) : (
                   <RoleBadge role={effectiveRole} />
                )}
              </div>

              <div style={{ borderTop: `1px solid ${THEME.colors.border}`, paddingTop: THEME.spacing.md }}>
                <ActionButton 
                  variant="danger" 
                  onClick={() => setLogoutModalOpen(true)}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Terminate Local Session
                </ActionButton>
              </div>
            </div>
          </SectionCard>

          {/* Sessions List */}
          <SectionCard 
            title="Active Sessions" 
            action={(
              <button 
                 onClick={() => setShowSessions(!showSessions)} 
                 style={{ background: 'none', border: 'none', color: THEME.colors.linen, fontSize: THEME.fontSizes.xs, cursor: 'pointer', textDecoration: 'underline' }}
              >
                 {showSessions ? 'Hide' : 'Show'}
              </button>
            )}
          >
             {!showSessions ? (
               <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.sm }}>Review history of logins on other devices.</div>
             ) : (
               <div style={{ display: 'grid', gap: THEME.spacing.sm }}>
                  {sessionsLoading ? (
                    <div style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.sm }}>Loading sessions...</div>
                  ) : sessions.length === 0 ? (
                    <div style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.sm }}>No sessions found.</div>
                  ) : (
                    sessions.map(sess => (
                      <div key={sess.id} style={{ 
                        padding: THEME.spacing.sm, 
                        background: THEME.colors.surface4, 
                        borderRadius: THEME.radius.sm,
                        border: `1px solid ${sess.isCurrent ? THEME.colors.linen : THEME.colors.border}`,
                        fontSize: THEME.fontSizes.xs
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <span style={{ color: THEME.colors.ivory, fontWeight: 500 }}>
                              {sess.isCurrent ? 'Current Session' : 'Device / Browser'}
                           </span>
                           {sess.isCurrent && <span style={{ color: THEME.colors.linen }}>Active now</span>}
                        </div>
                        <div style={{ color: THEME.colors.muted, marginTop: '4px' }}>
                          Created: {new Date(sess.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                  {sessions.length > 1 && (
                     <button 
                      onClick={() => setRevokeModalOpen(true)}
                      disabled={saving}
                      style={{ 
                        marginTop: THEME.spacing.xs, 
                        color: THEME.colors.emerald, 
                        background: 'none', 
                        border: 'none', 
                        cursor: saving ? 'not-allowed' : 'pointer', 
                        fontSize: THEME.fontSizes.xs, 
                        textAlign: 'left', 
                        padding: 0,
                        opacity: saving ? 0.6 : 1
                      }}>
                       ● Sign out from other devices
                     </button>
                  )}
               </div>
             )}
          </SectionCard>

          {/* Activity Logs (Brief) */}
          <SectionCard 
             title="Recent Activity" 
             action={(
               <button 
                  onClick={() => setShowActivity(!showActivity)} 
                  style={{ background: 'none', border: 'none', color: THEME.colors.linen, fontSize: THEME.fontSizes.xs, cursor: 'pointer', textDecoration: 'underline' }}
               >
                  {showActivity ? 'Hide' : 'Show'}
               </button>
             )}
          >
             {!showActivity ? (
               <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.sm }}>Continuous trail of security events.</div>
             ) : (
               <div style={{ display: 'grid', gap: THEME.spacing.md }}>
                  {auditLoading ? (
                    <div style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.sm }}>Loading logs...</div>
                  ) : auditLogs.length === 0 ? (
                    <div style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.sm }}>No logs found.</div>
                  ) : (
                    auditLogs.slice(0, 5).map(log => (
                      <div key={log.id} style={{ display: 'flex', gap: THEME.spacing.sm, alignItems: 'flex-start' }}>
                         <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: THEME.colors.linen, marginTop: '5px' }} />
                         <div>
                            <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.xs, fontWeight: 500 }}>
                               {log.action.replace(/_/g, ' ')}
                            </div>
                            <div style={{ color: THEME.colors.muted, fontSize: '10px' }}>
                               {new Date(log.createdAt).toLocaleString()}
                            </div>
                         </div>
                      </div>
                    ))
                  )}
               </div>
             )}
          </SectionCard>
        </div>
      </div>

      <ConfirmModal
        open={logoutModalOpen}
        title="Terminate Session"
        message="End your current session? You will be automatically redirected to the login portal."
        confirmLabel="Logout Now"
        danger={true}
        onConfirm={handleLogout}
        onCancel={() => setLogoutModalOpen(false)}
      />

      <ConfirmModal
        open={revokeModalOpen}
        title="Revoke Other Sessions"
        message="This will sign you out from all other devices and browsers. You will remain signed in on this device."
        confirmLabel="Revoke Others"
        danger={true}
        loading={saving}
        onConfirm={handleRevokeOthers}
        onCancel={() => setRevokeModalOpen(false)}
      />

      {ToastComponent}
    </div>
  );
}
