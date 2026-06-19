import React, { memo } from 'react';
import { THEME } from '@/lib/admin/theme';
import {
  SectionCard, FormField, TextInput,
  ActionButton, Toggle,
} from '@/components/admin/shared';
import type { NotificationsForm } from '../_utils/validationHelpers';

interface NotificationsSectionProps {
  form: NotificationsForm;
  errors: Partial<Record<keyof NotificationsForm, string>>;
  dirty: boolean;
  saving: boolean;
  onFieldChange: <K extends keyof NotificationsForm>(key: K, value: NotificationsForm[K]) => void;
  onTogglePreference: (key: string, value: boolean) => void;
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

const NOTIFICATION_TYPES = [
  { key: 'newPaidOrders', label: 'New paid orders', helper: 'Alert when a paid order is placed' },
  { key: 'newCodOrders', label: 'New COD orders', helper: 'Alert for COD orders needing confirmation' },
  { key: 'stockCritical', label: 'Stock critical (0 units)', helper: 'Alert when any variant goes out of stock' },
  { key: 'stockLow', label: 'Stock low', helper: 'Alert when stock drops below threshold' },
  { key: 'returnRequests', label: 'Return requests', helper: 'Alert when customer requests a return' },
];

export const NotificationsSection = memo(function NotificationsSection({
  form,
  errors,
  dirty,
  saving,
  onFieldChange,
  onTogglePreference,
  onSave,
}: NotificationsSectionProps) {
  const hasWhatsappNumbers =
    form.adminWhatsapp || form.inventoryManagerWhatsapp;

  return (
    <SectionCard
      title="Operational notifications"
      action={<SectionSave loading={saving} dirty={dirty} onClick={onSave} />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <FormField
          label="Admin WhatsApp number"
          helper="Receives new order and return alerts"
          error={errors.adminWhatsapp}
          errorId="settings-admin-whatsapp-error"
        >
          <TextInput
            type="tel"
            placeholder="9876543210"
            value={form.adminWhatsapp}
            onChange={e => onFieldChange('adminWhatsapp', e.target.value)}
            aria-invalid={!!errors.adminWhatsapp}
            aria-describedby={errors.adminWhatsapp ? 'settings-admin-whatsapp-error' : undefined}
          />
        </FormField>

        <FormField
          label="Inventory manager WhatsApp"
          helper="Receives stock low alerts"
          error={errors.inventoryManagerWhatsapp}
          errorId="settings-inv-whatsapp-error"
        >
          <TextInput
            type="tel"
            placeholder="9876543210"
            value={form.inventoryManagerWhatsapp}
            onChange={e => onFieldChange('inventoryManagerWhatsapp', e.target.value)}
            aria-invalid={!!errors.inventoryManagerWhatsapp}
            aria-describedby={
              errors.inventoryManagerWhatsapp ? 'settings-inv-whatsapp-error' : undefined
            }
          />
        </FormField>

        {!hasWhatsappNumbers && (
          <div
            style={{
              background: 'rgba(120,90,30,0.08)',
              border: `1px solid rgba(168,132,58,0.2)`,
              borderRadius: THEME.radius.md,
              padding: '10px 12px',
              fontSize: THEME.fontSizes.sm,
              color: THEME.colors.linenDark,
              fontFamily: THEME.fonts.ui,
            }}
          >
            Add WhatsApp numbers above to receive operational alerts
          </div>
        )}

        <div style={{ borderTop: `1px solid ${THEME.colors.ghost}`, paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              fontSize: THEME.fontSizes.xs,
              color: THEME.colors.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: THEME.fonts.ui,
            }}
          >
            Alert types
          </div>
          {NOTIFICATION_TYPES.map(item => (
            <div
              key={item.key}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <div
                  style={{
                    fontSize: THEME.fontSizes.base,
                    color: THEME.colors.ivory,
                    fontFamily: THEME.fonts.ui,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: THEME.fontSizes.xs,
                    color: THEME.colors.muted,
                    fontFamily: THEME.fonts.ui,
                    marginTop: '2px',
                  }}
                >
                  {item.helper}
                </div>
              </div>
              <Toggle
                checked={(form.preferences[item.key] as boolean) || false}
                onChange={v => onTogglePreference(item.key, v)}
              />
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
});
