import { useState, useCallback } from 'react';
import { adminUsersApi } from '@/lib/admin/api';
import type { AdminRole } from '@/lib/admin/types';
import { mapError } from '@/lib/admin/errors';

interface UseUsersFormProps {
  onSuccess?: () => void;
  onReload?: () => void;
}

import { z } from 'zod';

const userFormSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  role: z.enum(['SUPER_ADMIN', 'INVENTORY_MANAGER', 'SUPPORT_AGENT'] as const),
});

export function useUsersForm({ onSuccess, onReload }: UseUsersFormProps = {}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'SUPPORT_AGENT' as AdminRole });
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'role', string>>>({});
  const [saving, setSaving] = useState(false);
  const [deactId, setDeactId] = useState<string | null>(null);

  const updateField = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm(p => ({ ...p, [key]: value }));
      setErrors(prev => (prev[key] ? { ...prev, [key]: '' } : prev));
    },
    []
  );

  const validate = useCallback(() => {
    const result = userFormSchema.safeParse(form);
    if (result.success) return {};
    
    const next: Partial<Record<'name' | 'email' | 'role', string>> = {};
    result.error.errors.forEach(err => {
      const field = err.path[0] as keyof typeof form;
      if (!next[field]) next[field] = err.message;
    });
    return next;
  }, [form]);

  const handleCreate = useCallback(async () => {
    const validationErrors = validate();
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      return { success: false, error: null };
    }
    try {
      setSaving(true);
      await adminUsersApi.create({ ...form, isActive: true });
      setShowForm(false);
      setForm({ name: '', email: '', role: 'SUPPORT_AGENT' });
      setErrors({});
      onReload?.();
      onSuccess?.();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: mapError(e) };
    } finally {
      setSaving(false);
    }
  }, [form, validate, onSuccess, onReload]);

  const openForm = useCallback(() => {
    setForm({ name: '', email: '', role: 'SUPPORT_AGENT' });
    setErrors({});
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setErrors({});
  }, []);

  return {
    // Form state
    showForm,
    form,
    errors,
    saving,
    // Form actions
    updateField,
    handleCreate,
    openForm,
    closeForm,
    // Deactivate state
    deactId,
    setDeactId,
  };
}
