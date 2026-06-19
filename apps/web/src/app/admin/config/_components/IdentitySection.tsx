import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';
import {
  SectionCard, FormField, TextInput,
  ActionButton,
} from '@/components/admin/shared';
import type { IdentityForm } from '../_utils/validationHelpers';

interface IdentitySectionProps {
  form: IdentityForm;
  errors: Partial<Record<keyof IdentityForm, string>>;
  dirty: boolean;
  saving: boolean;
  onFieldChange: <K extends keyof IdentityForm>(key: K, value: IdentityForm[K]) => void;
  onSave: () => void;
}

function SectionSave({
  loading,
  onClick,
  dirty,
}: {
  loading: boolean;
  onClick: () => void;
  dirty: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {dirty && (
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: THEME.colors.warning,
          }}
          title="Unsaved changes"
        />
      )}
      <ActionButton
        onClick={onClick}
        loading={loading}
        variant={dirty ? 'primary' : 'ghost'}
      >
        Save
      </ActionButton>
    </div>
  );
}

export const IdentitySection = memo(function IdentitySection({
  form,
  errors,
  dirty,
  saving,
  onFieldChange,
  onSave,
}: IdentitySectionProps) {
  return (
    <SectionCard
      title="Store identity"
      action={<SectionSave loading={saving} dirty={dirty} onClick={onSave} />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <FormField
          label="Store name"
          required
          error={errors.storeName}
          errorId="settings-store-name-error"
        >
          <TextInput
            value={form.storeName}
            onChange={e => onFieldChange('storeName', e.target.value)}
            aria-invalid={!!errors.storeName}
            aria-describedby={errors.storeName ? 'settings-store-name-error' : undefined}
          />
        </FormField>

        <FormField
          label="Contact email"
          error={errors.storeEmail}
          errorId="settings-store-email-error"
        >
          <TextInput
            type="email"
            value={form.storeEmail}
            onChange={e => onFieldChange('storeEmail', e.target.value)}
            aria-invalid={!!errors.storeEmail}
            aria-describedby={errors.storeEmail ? 'settings-store-email-error' : undefined}
          />
        </FormField>

        <FormField
          label="Contact phone"
          error={errors.storePhone}
          errorId="settings-store-phone-error"
        >
          <TextInput
            type="tel"
            value={form.storePhone}
            onChange={e => onFieldChange('storePhone', e.target.value)}
            aria-invalid={!!errors.storePhone}
            aria-describedby={errors.storePhone ? 'settings-store-phone-error' : undefined}
          />
        </FormField>

        <FormField
          label="GST number"
          helper="15-character alphanumeric — printed on all customer invoices"
          error={errors.gstNumber}
          errorId="settings-gst-error"
        >
          <TextInput
            value={form.gstNumber}
            onChange={e => onFieldChange('gstNumber', e.target.value.toUpperCase())}
            style={{ fontFamily: THEME.fonts.mono, letterSpacing: '0.05em' }}
            aria-invalid={!!errors.gstNumber}
            aria-describedby={errors.gstNumber ? 'settings-gst-error' : undefined}
          />
        </FormField>
      </div>
    </SectionCard>
  );
});
