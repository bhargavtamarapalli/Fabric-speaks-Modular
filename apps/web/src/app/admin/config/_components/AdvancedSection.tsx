import React, { memo, useState } from 'react';
import { THEME } from '@/lib/admin/theme';
import {
  SectionCard, Toggle, ActionButton,
} from '@/components/admin/shared';
import { settingsApi } from '@/lib/admin/api';

interface AdvancedSectionProps {
  razorpayLiveMode: boolean;
  onUpdate: () => void;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

export const AdvancedSection = memo(function AdvancedSection({
  razorpayLiveMode,
  onUpdate,
  onError,
  onSuccess,
}: AdvancedSectionProps) {
  const [showRazorpayConfirm, setShowRazorpayConfirm] = useState(false);
  const [checklist, setChecklist] = useState([false, false, false]);
  const [saving, setSaving] = useState(false);

  const handleEnableLiveMode = async () => {
    try {
      setSaving(true);
      await settingsApi.update('razorpay_live_mode', 'true');
      onSuccess('Razorpay switched to live mode');
      setShowRazorpayConfirm(false);
      setChecklist([false, false, false]);
      onUpdate();
    } catch (e: any) {
      onError(e.message || 'Failed to update Razorpay mode');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableLiveMode = async () => {
    setSaving(true);
    try {
      await settingsApi.update('razorpay_live_mode', 'false');
      onSuccess('Razorpay switched to test mode');
      onUpdate();
    } catch (e: any) {
      onError(e.message || 'Failed to update Razorpay mode');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard title="Advanced">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div
              style={{
                fontSize: THEME.fontSizes.base,
                color: THEME.colors.ivory,
                fontFamily: THEME.fonts.ui,
              }}
            >
              Razorpay mode
            </div>
            <div
              style={{
                fontSize: THEME.fontSizes.xs,
                color: THEME.colors.muted,
                fontFamily: THEME.fonts.ui,
                marginTop: '2px',
              }}
            >
              Currently:{' '}
              <span
                style={{
                  color: razorpayLiveMode ? THEME.colors.error : THEME.colors.success,
                  fontWeight: 600,
                }}
              >
                {razorpayLiveMode ? 'LIVE' : 'TEST'}
              </span>
            </div>
          </div>
          <Toggle
            checked={razorpayLiveMode}
            onChange={v => {
              if (v) {
                setShowRazorpayConfirm(true);
              } else {
                handleDisableLiveMode();
              }
            }}
          />
        </div>
        {razorpayLiveMode && (
          <div
            style={{
              marginTop: '10px',
              background: 'rgba(184,76,60,0.07)',
              border: `1px solid rgba(184,76,60,0.15)`,
              borderRadius: THEME.radius.md,
              padding: '10px 12px',
              fontSize: THEME.fontSizes.sm,
              color: THEME.colors.error,
              fontFamily: THEME.fonts.ui,
            }}
          >
            Live mode is active. Real payments will be processed.
          </div>
        )}
      </SectionCard>

      {showRazorpayConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={() => setShowRazorpayConfirm(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
            }}
          />
          <div
            style={{
              position: 'relative',
              background: THEME.colors.surface,
              border: `1px solid ${THEME.colors.border}`,
              borderRadius: THEME.radius.lg,
              padding: '24px',
              maxWidth: 'min(100vw - 32px, 400px)',
            }}
          >
            <h3
              style={{
                fontSize: THEME.fontSizes.md,
                color: THEME.colors.ivory,
                fontFamily: THEME.fonts.ui,
                fontWeight: 500,
                margin: '0 0 8px',
              }}
            >
              Switch to Razorpay live mode?
            </h3>
            <p
              style={{
                fontSize: THEME.fontSizes.sm,
                color: THEME.colors.ash,
                fontFamily: THEME.fonts.ui,
                marginBottom: '16px',
              }}
            >
              Confirm all of the following before enabling:
            </p>
            {[
              'Razorpay KYC is approved',
              'Bank account is linked to Razorpay',
              'Test payments have been verified successfully',
            ].map((item, i) => (
              <label
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '10px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={checklist[i]}
                  onChange={e =>
                    setChecklist(prev =>
                      prev.map((v, j) => (j === i ? e.target.checked : v))
                    )
                  }
                  style={{
                    accentColor: THEME.colors.linen,
                    width: '16px',
                    height: '16px',
                  }}
                />
                <span
                  style={{
                    fontSize: THEME.fontSizes.base,
                    color: THEME.colors.ivory,
                    fontFamily: THEME.fonts.ui,
                  }}
                >
                  {item}
                </span>
              </label>
            ))}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
                marginTop: '16px',
              }}
            >
              <ActionButton
                variant="ghost"
                onClick={() => {
                  setShowRazorpayConfirm(false);
                  setChecklist([false, false, false]);
                }}
              >
                Cancel
              </ActionButton>
              <ActionButton
                variant="danger"
                disabled={!checklist.every(Boolean) || saving}
                loading={saving}
                onClick={handleEnableLiveMode}
              >
                Enable live mode
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
