import { useState, useCallback, useEffect } from 'react';
import { settingsApi } from '@/lib/admin/api';
import { mapError } from '@/lib/admin/errors';
import type { StoreSettings } from '@/lib/admin/types';
import { NotificationsForm, validateNotifications } from '../_utils/validationHelpers';

type NotificationPreferences = StoreSettings['notificationPreferences'];

export function useNotificationsForm({
  initialData,
  onSuccess,
}: {
  initialData?: Partial<StoreSettings> | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<NotificationsForm>(() => ({
    adminWhatsapp: initialData?.adminWhatsapp || '',
    inventoryManagerWhatsapp: initialData?.inventoryManagerWhatsapp || '',
    preferences: initialData?.notificationPreferences || {
      newPaidOrders: true,
      newCodOrders: true,
      stockCritical: true,
      stockLow: true,
      returnRequests: true,
    },
  }));

  const [errors, setErrors] = useState<Partial<Record<keyof NotificationsForm, string>>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const nextPreferences = initialData?.notificationPreferences || {
      newPaidOrders: true,
      newCodOrders: true,
      stockCritical: true,
      stockLow: true,
      returnRequests: true,
    };

    const nextForm: NotificationsForm = {
      adminWhatsapp: initialData?.adminWhatsapp || '',
      inventoryManagerWhatsapp: initialData?.inventoryManagerWhatsapp || '',
      preferences: nextPreferences,
    };

    setForm(prev => {
      const samePreferences =
        prev.preferences.newPaidOrders === nextPreferences.newPaidOrders &&
        prev.preferences.newCodOrders === nextPreferences.newCodOrders &&
        prev.preferences.stockCritical === nextPreferences.stockCritical &&
        prev.preferences.stockLow === nextPreferences.stockLow &&
        prev.preferences.returnRequests === nextPreferences.returnRequests;

      if (
        prev.adminWhatsapp === nextForm.adminWhatsapp &&
        prev.inventoryManagerWhatsapp === nextForm.inventoryManagerWhatsapp &&
        samePreferences
      ) {
        return prev;
      }

      return nextForm;
    });
    setDirty(false);
  }, [
    initialData?.adminWhatsapp,
    initialData?.inventoryManagerWhatsapp,
    initialData?.notificationPreferences?.newPaidOrders,
    initialData?.notificationPreferences?.newCodOrders,
    initialData?.notificationPreferences?.stockCritical,
    initialData?.notificationPreferences?.stockLow,
    initialData?.notificationPreferences?.returnRequests,
  ]);

  const updateField = useCallback(<K extends keyof NotificationsForm>(key: K, value: NotificationsForm[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setDirty(true);
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  }, [errors]);

  const togglePreference = useCallback((key: string, value: boolean) => {
    setForm(p => ({
      ...p,
      preferences: { ...p.preferences, [key]: value },
    }));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    const next = validateNotifications(form);
    if (Object.values(next).some(Boolean)) {
      setErrors(next);
      return;
    }

    try {
      setSaving(true);
      await Promise.all([
        settingsApi.update('admin_whatsapp', form.adminWhatsapp),
        settingsApi.update('inventory_manager_whatsapp', form.inventoryManagerWhatsapp),
        settingsApi.update('notification_preferences', JSON.stringify(form.preferences)),
      ]);
      setDirty(false);
      setErrors({});
      onSuccess();
    } catch (e: unknown) {
      const mapped = mapError(e);
      setErrors({ adminWhatsapp: mapped });
    } finally {
      setSaving(false);
    }
  }, [form, onSuccess]);

  return { form, updateField, togglePreference, errors, dirty, saving, handleSave };
}
