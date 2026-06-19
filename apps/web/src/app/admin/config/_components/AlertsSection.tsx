import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';
import {
  SectionCard, FormField, TextInput,
  ActionButton,
} from '@/components/admin/shared';
import type { AlertsForm } from '../_utils/validationHelpers';

interface AlertsSectionProps {
  form: AlertsForm;
  errors: Partial<Record<keyof AlertsForm, string>>;
  dirty: boolean;
  saving: boolean;
  onFieldChange: <K extends keyof AlertsForm>(key: K, value: AlertsForm[K]) => void;
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

export const AlertsSection = memo(function AlertsSection({
  form,
  errors,
  dirty,
  saving,
  onFieldChange,
  onSave,
}: AlertsSectionProps) {
  return (
    <SectionCard
      title="Inventory alerts"
      action={<SectionSave loading={saving} dirty={dirty} onClick={onSave} />}
    >
      <FormField
        label="Stock alert threshold"
        helper="Send WhatsApp alert when stock drops below this number"
        error={errors.stockAlertThreshold}
        errorId="settings-stock-threshold-error"
      >
        <TextInput
          type="number"
          min="1"
          max="100"
          value={String(form.stockAlertThreshold)}
          onChange={e => onFieldChange('stockAlertThreshold', parseInt(e.target.value, 10) || 5)}
          style={{ maxWidth: '120px' }}
          aria-invalid={!!errors.stockAlertThreshold}
          aria-describedby={errors.stockAlertThreshold ? 'settings-stock-threshold-error' : undefined}
        />
      </FormField>
    </SectionCard>
  );
});
