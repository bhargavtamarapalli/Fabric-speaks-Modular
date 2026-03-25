import { useState, useCallback } from 'react';
import { settingsApi } from '@/lib/admin/api';
import { mapError } from '@/lib/admin/errors';
import type { StoreSettings } from '@/lib/admin/types';
import { ShippingForm, validateShipping } from '../_utils/validationHelpers';

export function useShippingForm({
  initialData,
  onSuccess,
}: {
  initialData: Partial<StoreSettings>;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<ShippingForm>({
    freeShippingAbove: initialData.freeShippingAbove || 0,
    codEnabled: initialData.codEnabled !== undefined ? initialData.codEnabled : true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ShippingForm, string>>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateField = useCallback(<K extends keyof ShippingForm>(key: K, value: ShippingForm[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setDirty(true);
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  }, [errors]);

  const handleSave = useCallback(async () => {
    const next = validateShipping(form);
    if (Object.values(next).some(Boolean)) {
      setErrors(next);
      return;
    }

    try {
      setSaving(true);
      await Promise.all([
        settingsApi.update('free_shipping_above', form.freeShippingAbove),
        settingsApi.update('cod_enabled', form.codEnabled),
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
