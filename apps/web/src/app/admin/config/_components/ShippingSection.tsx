import React, { memo, useState } from 'react';
import { THEME } from '@/lib/admin/theme';
import {
  SectionCard, FormField, TextInput,
  ActionButton, Toggle, ConfirmModal,
} from '@/components/admin/shared';
import type { ShippingForm } from '../_utils/validationHelpers';

interface ShippingSectionProps {
  form: ShippingForm;
  errors: Partial<Record<keyof ShippingForm, string>>;
  dirty: boolean;
  saving: boolean;
  onFieldChange: <K extends keyof ShippingForm>(key: K, value: ShippingForm[K]) => void;
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

export const ShippingSection = memo(function ShippingSection({
  form,
  errors,
  dirty,
  saving,
  onFieldChange,
  onSave,
}: ShippingSectionProps) {
  const [showCodConfirm, setShowCodConfirm] = useState(false);

  return (
    <>
      <SectionCard
        title="Shipping and payments"
        action={<SectionSave loading={saving} dirty={dirty} onClick={onSave} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormField
            label="Free shipping above"
            helper="Orders above this amount get free shipping"
            error={errors.freeShippingAbove}
            errorId="settings-free-shipping-error"
          >
            <TextInput
              type="number"
              prefix="₹"
              value={String(form.freeShippingAbove)}
              onChange={e => onFieldChange('freeShippingAbove', parseInt(e.target.value, 10) || 0)}
              aria-invalid={!!errors.freeShippingAbove}
              aria-describedby={errors.freeShippingAbove ? 'settings-free-shipping-error' : undefined}
            />
          </FormField>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: `1px solid ${THEME.colors.ghost}`,
              paddingTop: '14px',
            }}
          >
            <div>
              <div style={{ fontSize: THEME.fontSizes.base, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>
                Cash on delivery
              </div>
              <div
                style={{
                  fontSize: THEME.fontSizes.xs,
                  color: THEME.colors.muted,
                  fontFamily: THEME.fonts.ui,
                  marginTop: '2px',
                }}
              >
                Enable COD globally across all pincodes
              </div>
            </div>
            <Toggle
              checked={form.codEnabled}
              onChange={v => {
                if (!v) {
                  setShowCodConfirm(true);
                } else {
                  onFieldChange('codEnabled', true);
                }
              }}
            />
          </div>

          {!form.codEnabled && (
            <div
              style={{
                background: 'rgba(184,76,60,0.07)',
                border: `1px solid rgba(184,76,60,0.15)`,
                borderRadius: THEME.radius.md,
                padding: '10px 12px',
                fontSize: THEME.fontSizes.sm,
                color: THEME.colors.error,
                fontFamily: THEME.fonts.ui,
              }}
            >
              COD is currently disabled. Customers cannot pay by cash on delivery.
            </div>
          )}
        </div>
      </SectionCard>

      <ConfirmModal
        open={showCodConfirm}
        title="Disable Cash on Delivery?"
        message="This will immediately disable COD for all customers across all pincodes. They will not see the COD option at checkout."
        onConfirm={() => {
          onFieldChange('codEnabled', false);
          setShowCodConfirm(false);
        }}
        onCancel={() => setShowCodConfirm(false)}
        confirmLabel="Yes, disable COD"
        danger
      />
    </>
  );
});
