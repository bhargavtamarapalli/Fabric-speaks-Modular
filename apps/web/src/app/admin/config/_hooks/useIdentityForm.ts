import { useState, useCallback, useEffect } from 'react';
import { settingsApi } from '@/lib/admin/api';
import { mapError } from '@/lib/admin/errors';
import type { StoreSettings } from '@/lib/admin/types';
import { IdentityForm, validateIdentity } from '../_utils/validationHelpers';

export function useIdentityForm({
  initialData,
  onSuccess,
}: {
  initialData?: Partial<StoreSettings> | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<IdentityForm>(() => ({
    storeName: initialData?.storeName || '',
    storeEmail: initialData?.storeEmail || '',
    storePhone: initialData?.storePhone || '',
    gstNumber: initialData?.gstNumber || '',
  }));

  const [errors, setErrors] = useState<Partial<Record<keyof IdentityForm, string>>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Update form when initialData changes (e.g., after settings are loaded)
  useEffect(() => {
    const nextForm: IdentityForm = {
      storeName: initialData?.storeName || '',
      storeEmail: initialData?.storeEmail || '',
      storePhone: initialData?.storePhone || '',
      gstNumber: initialData?.gstNumber || '',
    };

    setForm(prev => (
      prev.storeName === nextForm.storeName &&
      prev.storeEmail === nextForm.storeEmail &&
      prev.storePhone === nextForm.storePhone &&
      prev.gstNumber === nextForm.gstNumber
        ? prev
        : nextForm
    ));
    setDirty(false);
  }, [
    initialData?.storeName,
    initialData?.storeEmail,
    initialData?.storePhone,
    initialData?.gstNumber,
  ]);

  const updateField = useCallback(<K extends keyof IdentityForm>(key: K, value: IdentityForm[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setDirty(true);
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  }, [errors]);

  const handleSave = useCallback(async () => {
    const next = validateIdentity(form);
    if (Object.values(next).some(Boolean)) {
      setErrors(next);
      return;
    }

    try {
      setSaving(true);
      await Promise.all([
        settingsApi.update('store_name', form.storeName),
        settingsApi.update('store_email', form.storeEmail),
        settingsApi.update('store_phone', form.storePhone),
        settingsApi.update('gst_number', form.gstNumber),
      ]);
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
