import { useState, useCallback } from 'react';
import { settingsApi } from '@/lib/admin/api';
import { mapError } from '@/lib/admin/errors';
import type { StoreSettings } from '@/lib/admin/types';
import { AlertsForm, validateAlerts } from '../_utils/validationHelpers';

export function useAlertsForm({
  initialData,
  onSuccess,
}: {
  initialData: Partial<StoreSettings>;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<AlertsForm>({
    stockAlertThreshold: initialData.stockAlertThreshold || 5,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AlertsForm, string>>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateField = useCallback(<K extends keyof AlertsForm>(key: K, value: AlertsForm[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setDirty(true);
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  }, [errors]);

  const handleSave = useCallback(async () => {
    const next = validateAlerts(form);
    if (Object.values(next).some(Boolean)) {
      setErrors(next);
      return;
    }

    try {
      setSaving(true);
      await settingsApi.update('stock_alert_threshold', form.stockAlertThreshold);
      setDirty(false);
      setErrors({});
      onSuccess();
    } catch (e: any) {
      throw new Error(mapError(e));
    } finally {
      setSaving(false);
    }
  }, [form, onSuccess]);

  return { form, updateField, errors, dirty, saving, handleSave };
}
