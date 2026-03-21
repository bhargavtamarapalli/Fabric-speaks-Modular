'use client';

// app/admin/config/page.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { THEME } from '@/lib/admin/theme';
import { settingsApi } from '@/lib/admin/api';
import type { StoreSettings } from '@/lib/admin/types';
import {
  PageHeader, SectionCard, FormField, TextInput, Textarea,
  ActionButton, Toggle, ErrorBanner, Loader, ConfirmModal, useToast,
} from '@/components/admin/shared';

type IdentityForm = {
  storeName:  string;
  storeEmail: string;
  storePhone: string;
  gstNumber:  string;
};

type ShippingForm = {
  freeShippingAbove: number;
  codEnabled: boolean;
};

type AlertsForm = {
  stockAlertThreshold: number;
};

type NotificationPreferences = StoreSettings['notificationPreferences'];

type NotificationsForm = {
  adminWhatsapp: string;
  inventoryManagerWhatsapp: string;
  preferences: NotificationPreferences;
};

// Save button per section
function SectionSave({ loading, onClick, dirty }: { loading: boolean; onClick: () => void; dirty: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {dirty && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: THEME.colors.warning }} title="Unsaved changes" />}
      <ActionButton onClick={onClick} loading={loading} variant={dirty ? 'primary' : 'ghost'}>
        Save
      </ActionButton>
    </div>
  );
}

export default function ConfigPage() {
  const { showToast, ToastComponent } = useToast();

  const [settings,  setSettings]  = useState<StoreSettings | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // Local drafts per section
  const [identity,  setIdentity]  = useState<IdentityForm>({ storeName: '', storeEmail: '', storePhone: '', gstNumber: '' });
  const [shipping,  setShipping]  = useState<ShippingForm>({ freeShippingAbove: 0, codEnabled: true });
  const [alerts,    setAlerts]    = useState<AlertsForm>({ stockAlertThreshold: 5 });
  const [notifs,    setNotifs]    = useState<NotificationsForm>({ adminWhatsapp: '', inventoryManagerWhatsapp: '', preferences: { newPaidOrders: true, newCodOrders: true, stockCritical: true, stockLow: true, returnRequests: true } });
  const [advanced,  setAdvanced]  = useState({ razorpayLiveMode: false });

  // Field errors per section
  const [identityErrors, setIdentityErrors] = useState<Partial<Record<keyof IdentityForm, string>>>({});
  const [shippingErrors, setShippingErrors] = useState<Partial<Record<keyof ShippingForm, string>>>({});
  const [alertsErrors,   setAlertsErrors]   = useState<Partial<Record<keyof AlertsForm, string>>>({});
  const [notifsErrors,   setNotifsErrors]   = useState<Partial<Record<keyof NotificationsForm, string>>>({});

  // Dirty flags
  const [dirtyIdentity, setDirtyIdentity] = useState(false);
  const [dirtyShipping, setDirtyShipping] = useState(false);
  const [dirtyAlerts,   setDirtyAlerts]   = useState(false);
  const [dirtyNotifs,   setDirtyNotifs]   = useState(false);

  // Loading flags per section
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savingAlerts,   setSavingAlerts]   = useState(false);
  const [savingNotifs,   setSavingNotifs]   = useState(false);

  // Confirm modals
  const [showCodConfirm,       setShowCodConfirm]       = useState(false);
  const [showRazorpayConfirm,  setShowRazorpayConfirm]  = useState(false);
  const [razorpayChecklist,    setRazorpayChecklist]     = useState([false, false, false]);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const s = await settingsApi.getAll();
      setSettings(s);
      setIdentity({ storeName: s.storeName, storeEmail: s.storeEmail, storePhone: s.storePhone, gstNumber: s.gstNumber });
      setShipping({ freeShippingAbove: s.freeShippingAbove, codEnabled: s.codEnabled });
      setAlerts({ stockAlertThreshold: s.stockAlertThreshold });
      setNotifs({ adminWhatsapp: s.adminWhatsapp, inventoryManagerWhatsapp: s.inventoryManagerWhatsapp, preferences: s.notificationPreferences });
      setAdvanced({ razorpayLiveMode: s.razorpayLiveMode });
    } catch (e: any) {
      setError(e.message ?? 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const normalizePhone = (value: string) => value.replace(/\D/g, '');
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isValidPhone = (value: string) => {
    const digits = normalizePhone(value);
    if (digits.length === 10) return true;
    if (digits.length === 12 && digits.startsWith('91')) return true;
    return false;
  };

  const updateIdentityField = <K extends keyof IdentityForm>(key: K, value: IdentityForm[K]) => {
    setIdentity(p => ({ ...p, [key]: value }));
    setDirtyIdentity(true);
    setIdentityErrors(prev => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const updateShippingField = <K extends keyof ShippingForm>(key: K, value: ShippingForm[K]) => {
    setShipping(p => ({ ...p, [key]: value }));
    setDirtyShipping(true);
    setShippingErrors(prev => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const updateAlertsField = <K extends keyof AlertsForm>(key: K, value: AlertsForm[K]) => {
    setAlerts(p => ({ ...p, [key]: value }));
    setDirtyAlerts(true);
    setAlertsErrors(prev => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const updateNotifsField = <K extends keyof NotificationsForm>(key: K, value: NotificationsForm[K]) => {
    setNotifs(p => ({ ...p, [key]: value }));
    setDirtyNotifs(true);
    setNotifsErrors(prev => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const validateIdentity = () => {
    const next: Partial<Record<keyof IdentityForm, string>> = {};
    if (!identity.storeName.trim()) next.storeName = 'Store name is required';
    if (identity.storeEmail && !isValidEmail(identity.storeEmail)) next.storeEmail = 'Enter a valid email address';
    if (identity.storePhone && !isValidPhone(identity.storePhone)) next.storePhone = 'Enter a valid phone number';
    if (identity.gstNumber && identity.gstNumber.length < 15) next.gstNumber = 'GST number must be at least 15 characters';
    if (identity.gstNumber && identity.gstNumber.length > 15) next.gstNumber = 'GST number cannot exceed 15 characters';
    return next;
  };

  const validateShipping = () => {
    const next: Partial<Record<keyof ShippingForm, string>> = {};
    if (Number.isNaN(shipping.freeShippingAbove) || shipping.freeShippingAbove < 0) {
      next.freeShippingAbove = 'Free shipping above must be a positive number';
    }
    return next;
  };

  const validateAlerts = () => {
    const next: Partial<Record<keyof AlertsForm, string>> = {};
    if (Number.isNaN(alerts.stockAlertThreshold) || alerts.stockAlertThreshold <= 0) {
      next.stockAlertThreshold = 'Stock alert threshold must be a positive number';
    }
    return next;
  };

  const validateNotifs = () => {
    const next: Partial<Record<keyof NotificationsForm, string>> = {};
    if (notifs.adminWhatsapp && !isValidPhone(notifs.adminWhatsapp)) {
      next.adminWhatsapp = 'Enter a valid phone number';
    }
    if (notifs.inventoryManagerWhatsapp && !isValidPhone(notifs.inventoryManagerWhatsapp)) {
      next.inventoryManagerWhatsapp = 'Enter a valid phone number';
    }
    return next;
  };

  const saveMultiple = async (
    updates: { key: string; value: string | boolean | number }[],
    setSaving: (v: boolean) => void,
    setDirty: (v: boolean) => void,
  ) => {
    try {
      setSaving(true);
      for (const u of updates) {
        await settingsApi.update(u.key, u.value);
      }
      showToast('Settings saved', 'success');
      setDirty(false);
    } catch (e: any) {
      showToast(e.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIdentity = () => {
    const next = validateIdentity();
    if (Object.values(next).some(Boolean)) {
      setIdentityErrors(next);
      return;
    }
    saveMultiple([
      { key: 'store_name',  value: identity.storeName },
      { key: 'store_email', value: identity.storeEmail },
      { key: 'store_phone', value: identity.storePhone },
      { key: 'gst_number',  value: identity.gstNumber },
    ], setSavingIdentity, setDirtyIdentity);
  };

  const handleSaveShipping = () => {
    const next = validateShipping();
    if (Object.values(next).some(Boolean)) {
      setShippingErrors(next);
      return;
    }
    saveMultiple([
      { key: 'free_shipping_above', value: shipping.freeShippingAbove },
      { key: 'cod_enabled',         value: shipping.codEnabled },
    ], setSavingShipping, setDirtyShipping);
  };

  const handleSaveAlerts = () => {
    const next = validateAlerts();
    if (Object.values(next).some(Boolean)) {
      setAlertsErrors(next);
      return;
    }
    saveMultiple([
      { key: 'stock_alert_threshold', value: alerts.stockAlertThreshold },
    ], setSavingAlerts, setDirtyAlerts);
  };

  const handleSaveNotifs = () => {
    const next = validateNotifs();
    if (Object.values(next).some(Boolean)) {
      setNotifsErrors(next);
      return;
    }
    saveMultiple([
      { key: 'admin_whatsapp',             value: notifs.adminWhatsapp },
      { key: 'inventory_manager_whatsapp', value: notifs.inventoryManagerWhatsapp },
      { key: 'notification_preferences',   value: JSON.stringify(notifs.preferences) },
    ], setSavingNotifs, setDirtyNotifs);
  };

  if (loading) return <Loader />;

  return (
    <div style={{ maxWidth: '640px' }}>
      <PageHeader title="Store settings" subtitle="Super Admin only — store-wide configuration" />

      {error && <div style={{ marginBottom: '12px' }}><ErrorBanner message={error} onRetry={load} /></div>}

      {/* Section 1 — Store identity */}
      <SectionCard
        title="Store identity"
        action={
          <SectionSave
            loading={savingIdentity}
            dirty={dirtyIdentity}
            onClick={handleSaveIdentity}
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <FormField label="Store name" required error={identityErrors.storeName} errorId="settings-store-name-error">
            <TextInput
              value={identity.storeName}
              onChange={e => updateIdentityField('storeName', e.target.value)}
              aria-invalid={!!identityErrors.storeName}
              aria-describedby={identityErrors.storeName ? 'settings-store-name-error' : undefined}
            />
          </FormField>
          <FormField label="Contact email" error={identityErrors.storeEmail} errorId="settings-store-email-error">
            <TextInput
              type="email"
              value={identity.storeEmail}
              onChange={e => updateIdentityField('storeEmail', e.target.value)}
              aria-invalid={!!identityErrors.storeEmail}
              aria-describedby={identityErrors.storeEmail ? 'settings-store-email-error' : undefined}
            />
          </FormField>
          <FormField label="Contact phone" error={identityErrors.storePhone} errorId="settings-store-phone-error">
            <TextInput
              type="tel"
              value={identity.storePhone}
              onChange={e => updateIdentityField('storePhone', e.target.value)}
              aria-invalid={!!identityErrors.storePhone}
              aria-describedby={identityErrors.storePhone ? 'settings-store-phone-error' : undefined}
            />
          </FormField>
          <FormField label="GST number" helper="15-character alphanumeric — printed on all customer invoices" error={identityErrors.gstNumber} errorId="settings-gst-error">
            <TextInput
              value={identity.gstNumber}
              onChange={e => updateIdentityField('gstNumber', e.target.value.toUpperCase())}
              style={{ fontFamily: THEME.fonts.mono, letterSpacing: '0.05em' }}
              aria-invalid={!!identityErrors.gstNumber}
              aria-describedby={identityErrors.gstNumber ? 'settings-gst-error' : undefined}
            />
          </FormField>
        </div>
      </SectionCard>

      {/* Section 2 — Shipping & payments */}
      <SectionCard
        title="Shipping and payments"
        action={
          <SectionSave
            loading={savingShipping}
            dirty={dirtyShipping}
            onClick={handleSaveShipping}
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormField label="Free shipping above" helper="Orders above this amount get free shipping" error={shippingErrors.freeShippingAbove} errorId="settings-free-shipping-error">
            <TextInput
              type="number"
              prefix="₹"
              value={String(shipping.freeShippingAbove)}
              onChange={e => updateShippingField('freeShippingAbove', parseInt(e.target.value, 10) || 0)}
              aria-invalid={!!shippingErrors.freeShippingAbove}
              aria-describedby={shippingErrors.freeShippingAbove ? 'settings-free-shipping-error' : undefined}
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${THEME.colors.ghost}`, paddingTop: '14px' }}>
            <div>
              <div style={{ fontSize: THEME.fontSizes.base, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>Cash on delivery</div>
              <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui, marginTop: '2px' }}>Enable COD globally across all pincodes</div>
            </div>
            <Toggle
              checked={shipping.codEnabled}
              onChange={v => {
                if (!v) {
                  setShowCodConfirm(true);
                } else {
                  updateShippingField('codEnabled', true);
                }
              }}
            />
          </div>

          {!shipping.codEnabled && (
            <div style={{ background: 'rgba(184,76,60,0.07)', border: `1px solid rgba(184,76,60,0.15)`, borderRadius: THEME.radius.md, padding: '10px 12px', fontSize: THEME.fontSizes.sm, color: THEME.colors.error, fontFamily: THEME.fonts.ui }}>
              COD is currently disabled. Customers cannot pay by cash on delivery.
            </div>
          )}
        </div>
      </SectionCard>

      {/* Section 3 — Inventory alerts */}
      <SectionCard
        title="Inventory alerts"
        action={
          <SectionSave
            loading={savingAlerts}
            dirty={dirtyAlerts}
            onClick={handleSaveAlerts}
          />
        }
      >
        <FormField label="Stock alert threshold" helper="Send WhatsApp alert when stock drops below this number" error={alertsErrors.stockAlertThreshold} errorId="settings-stock-threshold-error">
          <TextInput
            type="number"
            min="1"
            max="100"
            value={String(alerts.stockAlertThreshold)}
            onChange={e => updateAlertsField('stockAlertThreshold', parseInt(e.target.value, 10) || 5)}
            style={{ maxWidth: '120px' }}
            aria-invalid={!!alertsErrors.stockAlertThreshold}
            aria-describedby={alertsErrors.stockAlertThreshold ? 'settings-stock-threshold-error' : undefined}
          />
        </FormField>
      </SectionCard>

      {/* Section 4 — Notifications */}
      <SectionCard
        title="Operational notifications"
        action={
          <SectionSave
            loading={savingNotifs}
            dirty={dirtyNotifs}
            onClick={handleSaveNotifs}
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormField label="Admin WhatsApp number" helper="Receives new order and return alerts" error={notifsErrors.adminWhatsapp} errorId="settings-admin-whatsapp-error">
            <TextInput
              type="tel"
              placeholder="9876543210"
              value={notifs.adminWhatsapp}
              onChange={e => updateNotifsField('adminWhatsapp', e.target.value)}
              aria-invalid={!!notifsErrors.adminWhatsapp}
              aria-describedby={notifsErrors.adminWhatsapp ? 'settings-admin-whatsapp-error' : undefined}
            />
          </FormField>

          <FormField label="Inventory manager WhatsApp" helper="Receives stock low alerts" error={notifsErrors.inventoryManagerWhatsapp} errorId="settings-inv-whatsapp-error">
            <TextInput
              type="tel"
              placeholder="9876543210"
              value={notifs.inventoryManagerWhatsapp}
              onChange={e => updateNotifsField('inventoryManagerWhatsapp', e.target.value)}
              aria-invalid={!!notifsErrors.inventoryManagerWhatsapp}
              aria-describedby={notifsErrors.inventoryManagerWhatsapp ? 'settings-inv-whatsapp-error' : undefined}
            />
          </FormField>

          {(!notifs.adminWhatsapp && !notifs.inventoryManagerWhatsapp) && (
            <div style={{ background: 'rgba(120,90,30,0.08)', border: `1px solid rgba(168,132,58,0.2)`, borderRadius: THEME.radius.md, padding: '10px 12px', fontSize: THEME.fontSizes.sm, color: THEME.colors.linenDark, fontFamily: THEME.fonts.ui }}>
              Add WhatsApp numbers above to receive operational alerts
            </div>
          )}

          <div style={{ borderTop: `1px solid ${THEME.colors.ghost}`, paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: THEME.fonts.ui }}>Alert types</div>
            {[
              { key: 'newPaidOrders',  label: 'New paid orders',       helper: 'Alert when a paid order is placed' },
              { key: 'newCodOrders',   label: 'New COD orders',        helper: 'Alert for COD orders needing confirmation' },
              { key: 'stockCritical',  label: 'Stock critical (0 units)',helper: 'Alert when any variant goes out of stock' },
              { key: 'stockLow',       label: 'Stock low',             helper: 'Alert when stock drops below threshold' },
              { key: 'returnRequests', label: 'Return requests',       helper: 'Alert when customer requests a return' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: THEME.fontSizes.base, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>{item.label}</div>
                  <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui, marginTop: '2px' }}>{item.helper}</div>
                </div>
                <Toggle
                  checked={(notifs.preferences as any)[item.key]}
                  onChange={v => {
                    setNotifs(p => ({ ...p, preferences: { ...p.preferences, [item.key]: v } }));
                    setDirtyNotifs(true);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Section 5 — Advanced */}
      <SectionCard title="Advanced">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: THEME.fontSizes.base, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>Razorpay mode</div>
            <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui, marginTop: '2px' }}>
              Currently: <span style={{ color: advanced.razorpayLiveMode ? THEME.colors.error : THEME.colors.success, fontWeight: 600 }}>{advanced.razorpayLiveMode ? 'LIVE' : 'TEST'}</span>
            </div>
          </div>
          <Toggle
            checked={advanced.razorpayLiveMode}
            onChange={v => {
              if (v) setShowRazorpayConfirm(true);
              else setAdvanced({ razorpayLiveMode: false });
            }}
          />
        </div>
        {advanced.razorpayLiveMode && (
          <div style={{ marginTop: '10px', background: 'rgba(184,76,60,0.07)', border: `1px solid rgba(184,76,60,0.15)`, borderRadius: THEME.radius.md, padding: '10px 12px', fontSize: THEME.fontSizes.sm, color: THEME.colors.error, fontFamily: THEME.fonts.ui }}>
            Live mode is active. Real payments will be processed.
          </div>
        )}
      </SectionCard>

      {/* COD confirmation modal */}
      <ConfirmModal
        open={showCodConfirm}
        title="Disable Cash on Delivery?"
        message="This will immediately disable COD for all customers across all pincodes. They will not see the COD option at checkout."
        onConfirm={() => { updateShippingField('codEnabled', false); setShowCodConfirm(false); }}
        onCancel={() => setShowCodConfirm(false)}
        confirmLabel="Yes, disable COD"
        danger
      />

      {/* Razorpay live mode modal */}
      {showRazorpayConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setShowRazorpayConfirm(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }} />
          <div style={{ position: 'relative', background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radius.lg, padding: '24px', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ fontSize: THEME.fontSizes.md, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontWeight: 500, margin: '0 0 8px' }}>Switch to Razorpay live mode?</h3>
            <p style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui, marginBottom: '16px' }}>Confirm all of the following before enabling:</p>
            {[
              'Razorpay KYC is approved',
              'Bank account is linked to Razorpay',
              'Test payments have been verified successfully',
            ].map((item, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={razorpayChecklist[i]}
                  onChange={e => setRazorpayChecklist(prev => prev.map((v, j) => j === i ? e.target.checked : v))}
                  style={{ accentColor: THEME.colors.linen, width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: THEME.fontSizes.base, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>{item}</span>
              </label>
            ))}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <ActionButton variant="ghost" onClick={() => { setShowRazorpayConfirm(false); setRazorpayChecklist([false,false,false]); }}>Cancel</ActionButton>
              <ActionButton
                variant="danger"
                disabled={!razorpayChecklist.every(Boolean)}
                onClick={() => { setAdvanced({ razorpayLiveMode: true }); setShowRazorpayConfirm(false); settingsApi.update('razorpay_live_mode', 'true').then(() => showToast('Razorpay switched to live mode', 'success')); }}
              >
                Enable live mode
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {ToastComponent}
    </div>
  );
}
