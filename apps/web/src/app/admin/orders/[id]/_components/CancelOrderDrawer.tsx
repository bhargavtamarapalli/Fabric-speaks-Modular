'use client';

import React from 'react';
import { THEME } from '@/lib/admin/theme';
import { Drawer, FormField, TextInput, Textarea, ActionButton } from '@/components/admin/shared';
import type { CancelForm } from '../_hooks/useOrderDetail';

interface CancelOrderDrawerProps {
  open: boolean;
  onClose: () => void;
  form: CancelForm;
  onFormChange: (patch: Partial<CancelForm>) => void;
  errors: Partial<Record<keyof CancelForm, string>>;
  onReview: () => void;
}

export function CancelOrderDrawer({
  open,
  onClose,
  form,
  onFormChange,
  errors,
  onReview,
}: CancelOrderDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title="Cancel Order">
      <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.md }}>
        <FormField label="Reason" required error={errors.reason}>
          <TextInput
            value={form.reason}
            onChange={e => onFormChange({ reason: e.target.value })}
            placeholder="Enter cancellation reason"
          />
        </FormField>
        <FormField label="Internal Note">
          <Textarea
            value={form.note}
            onChange={e => onFormChange({ note: e.target.value })}
            placeholder="Optional note for audit logs"
          />
        </FormField>
        <ActionButton onClick={onReview}>Review Cancellation</ActionButton>
      </div>
    </Drawer>
  );
}
