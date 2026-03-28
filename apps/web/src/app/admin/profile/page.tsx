'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { THEME } from '@/lib/admin/theme';
import {
  ActionButton,
  ErrorBanner,
  FormField,
  PageHeader,
  TextInput,
  useToast,
} from '@/components/admin/shared';
import { mapError } from '@/lib/admin/errors';

type AdminProfile = {
  name: string;
  email: string;
  mobile: string;
  whatsapp_enabled: boolean;
};

const EMPTY_PROFILE: AdminProfile = {
  name: '',
  email: '',
  mobile: '',
  whatsapp_enabled: false,
};

export default function AdminProfilePage() {
  const { showToast, ToastComponent } = useToast();
  const [profile, setProfile] = useState<AdminProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AdminProfile, string>>>({});

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Partial<AdminProfile>>('/auth/customer/profile');
      setProfile({
        name: data?.name?.trim() || '',
        email: data?.email?.trim() || '',
        mobile: data?.mobile?.trim() || '',
        whatsapp_enabled: Boolean(data?.whatsapp_enabled),
      });
    } catch (e: unknown) {
      setError(mapError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const validate = () => {
    const next: Partial<Record<keyof AdminProfile, string>> = {};
    if (!profile.name.trim()) next.name = 'Name is required';
    if (!profile.email.trim()) next.email = 'Email is required';
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) next.email = 'Enter a valid email address';
    if (profile.mobile && !/^\d{10}$/.test(profile.mobile.replace(/\D/g, ''))) next.mobile = 'Enter a valid phone number';
    return next;
  };

  const handleSave = async () => {
    const validationErrors = validate();
    if (Object.values(validationErrors).some(Boolean)) {
      setFieldErrors(validationErrors);
      return;
    }

    try {
      setSaving(true);
      await apiFetch('/auth/customer/profile', {
        method: 'PATCH',
        data: {
          name: profile.name.trim(),
          email: profile.email.trim(),
          mobile: profile.mobile.trim() || null,
          whatsapp_enabled: profile.whatsapp_enabled,
        },
      });
      showToast('Profile updated successfully', 'success');
      setFieldErrors({});
      await loadProfile();
    } catch (e: unknown) {
      showToast(mapError(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof AdminProfile>(key: K, value: AdminProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Manage your admin account details and notification channel"
      />

      {error && (
        <div style={{ marginBottom: THEME.spacing.md }}>
          <ErrorBanner message={error} onRetry={loadProfile} />
        </div>
      )}

      <div
        style={{
          background: THEME.colors.surface3,
          border: `1px solid ${THEME.colors.border}`,
          borderRadius: THEME.radius.lg,
          padding: THEME.spacing.lg,
          maxWidth: '720px',
          display: 'grid',
          gap: THEME.spacing.md,
        }}
      >
        <FormField label="Full name" required error={fieldErrors.name}>
          <TextInput
            value={profile.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Enter full name"
            disabled={loading || saving}
            aria-invalid={!!fieldErrors.name}
          />
        </FormField>

        <FormField label="Email" required error={fieldErrors.email}>
          <TextInput
            type="email"
            value={profile.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="name@company.com"
            disabled={loading || saving}
            aria-invalid={!!fieldErrors.email}
          />
        </FormField>

        <FormField label="Mobile number" helper="Used for WhatsApp and SMS style alerts" error={fieldErrors.mobile}>
          <TextInput
            type="tel"
            value={profile.mobile}
            onChange={(e) => updateField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit mobile number"
            disabled={loading || saving}
            aria-invalid={!!fieldErrors.mobile}
          />
        </FormField>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: `1px solid ${THEME.colors.border}`,
            borderRadius: THEME.radius.md,
            padding: THEME.spacing.sm,
            background: THEME.colors.surface2,
          }}
        >
          <div>
            <div style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.base }}>
              WhatsApp Alerts
            </div>
            <div style={{ color: THEME.colors.muted, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.xs }}>
              Receive admin reminders and service alerts on WhatsApp.
            </div>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: THEME.spacing.xs, cursor: loading || saving ? 'not-allowed' : 'pointer' }}>
            <input
              type="checkbox"
              checked={profile.whatsapp_enabled}
              onChange={(e) => updateField('whatsapp_enabled', e.target.checked)}
              disabled={loading || saving || !profile.mobile}
            />
            <span style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.xs }}>
              {profile.whatsapp_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: THEME.spacing.sm }}>
          <ActionButton variant="ghost" onClick={loadProfile} disabled={loading || saving}>
            Reset
          </ActionButton>
          <ActionButton onClick={handleSave} loading={saving} disabled={loading}>
            Save Profile
          </ActionButton>
        </div>
      </div>

      {ToastComponent}
    </div>
  );
}
