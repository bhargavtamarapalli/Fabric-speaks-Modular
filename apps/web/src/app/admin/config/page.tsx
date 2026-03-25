'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { settingsApi } from '@/lib/admin/api';
import { mapError } from '@/lib/admin/errors';
import type { StoreSettings } from '@/lib/admin/types';
import { PageHeader, ErrorBanner, Loader, useToast } from '@/components/admin/shared';
import { useIdentityForm } from './_hooks/useIdentityForm';
import { useShippingForm } from './_hooks/useShippingForm';
import { useAlertsForm } from './_hooks/useAlertsForm';
import { useNotificationsForm } from './_hooks/useNotificationsForm';
import { IdentitySection } from './_components/IdentitySection';
import { ShippingSection } from './_components/ShippingSection';
import { AlertsSection } from './_components/AlertsSection';
import { NotificationsSection } from './_components/NotificationsSection';
import { AdvancedSection } from './_components/AdvancedSection';


export default function ConfigPage() {
  const { showToast, ToastComponent } = useToast();

  // Main data loading state
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all settings on mount - defined before hooks
  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const s = await settingsApi.getAll();
      setSettings(s);
    } catch (e: any) {
      setError(mapError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize each section's hook
  const identity = useIdentityForm({
    initialData: settings || {},
    onSuccess: () => {
      showToast('Store identity saved', 'success');
      load();
    },
  });

  const shipping = useShippingForm({
    initialData: settings || {},
    onSuccess: () => {
      showToast('Shipping settings saved', 'success');
      load();
    },
  });

  const alerts = useAlertsForm({
    initialData: settings || {},
    onSuccess: () => {
      showToast('Alert threshold saved', 'success');
      load();
    },
  });

  const notifications = useNotificationsForm({
    initialData: settings || {},
    onSuccess: () => {
      showToast('Notification preferences saved', 'success');
      load();
    },
  });

  useEffect(() => {
    load();
  }, [load]);

  // Handlers for save buttons
  const handleSaveIdentity = async () => {
    try {
      await identity.handleSave();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleSaveShipping = async () => {
    try {
      await shipping.handleSave();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleSaveAlerts = async () => {
    try {
      await alerts.handleSave();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await notifications.handleSave();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  if (loading) return <Loader />;

  return (
    <div style={{ maxWidth: '100%', width: '640px' }}>
      <PageHeader
        title="Store settings"
        subtitle="Super Admin only — store-wide configuration"
      />

      {error && (
        <div style={{ marginBottom: '12px' }}>
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      <IdentitySection
        form={identity.form}
        errors={identity.errors}
        dirty={identity.dirty}
        saving={identity.saving}
        onFieldChange={identity.updateField}
        onSave={handleSaveIdentity}
      />

      <ShippingSection
        form={shipping.form}
        errors={shipping.errors}
        dirty={shipping.dirty}
        saving={shipping.saving}
        onFieldChange={shipping.updateField}
        onSave={handleSaveShipping}
      />

      <AlertsSection
        form={alerts.form}
        errors={alerts.errors}
        dirty={alerts.dirty}
        saving={alerts.saving}
        onFieldChange={alerts.updateField}
        onSave={handleSaveAlerts}
      />

      <NotificationsSection
        form={notifications.form}
        errors={notifications.errors}
        dirty={notifications.dirty}
        saving={notifications.saving}
        onFieldChange={notifications.updateField}
        onTogglePreference={notifications.togglePreference}
        onSave={handleSaveNotifications}
      />

      <AdvancedSection
        razorpayLiveMode={settings?.razorpayLiveMode || false}
        onUpdate={load}
        onError={(error: string) => showToast(error, 'error')}
        onSuccess={(message: string) => showToast(message, 'success')}
      />

      {ToastComponent}
    </div>
  );
}
