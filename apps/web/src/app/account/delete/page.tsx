'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';
import { AlertTriangle, Lock, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AccountDeletionPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'DISCLAIMER' | 'OTP' | 'SUCCESS'>('DISCLAIMER');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOtp = async () => {
    const controller = new AbortController();
    try {
      setLoading(true);
      setError('');
      // Trigger OTP generation exclusively for the logged in user's mobile context
      await apiFetch('/auth/delete-otp-request', {
        method: 'POST',
        signal: controller.signal
      });
      setStep('OTP');
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return;
      setError(err.message || 'Could not send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeletion = async () => {
    if (otp.length < 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      // Fires the rule-compliant deletion triggering cooling-off period
      await apiFetch('/auth/account', {
        method: 'DELETE',
        data: { otp },
      });
      setStep('SUCCESS');
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return;
      setError(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'SUCCESS') {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 bg-red-950/30 rounded-full flex items-center justify-center mx-auto text-red-500 mb-6">
          <LogOut className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif text-[var(--fs-ivory)]">Account Deletion Initiated</h2>
        <p className="text-[var(--fs-ash)] leading-relaxed">
          Your account deletion request has been registered and is now in the 14-day cooling off period as per DPDPA regulations.
        </p>
        <p className="text-[var(--fs-ash)] text-sm">You have been logged out securely.</p>
        <button
          onClick={() => {
            logout(); // Clear internal client states
            router.push('/');
          }}
          className="px-8 py-4 mt-8 bg-[var(--fs-linen)] text-[var(--fs-void)] font-medium uppercase tracking-[0.15em] text-sm hover:bg-gray-200 transition"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-2xl font-serif text-red-500 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" /> Danger Zone
        </h2>
        <p className="text-sm text-gray-400 mt-1">Permanently remove your account and personal data.</p>
      </div>

      <div className="p-6 bg-red-950/10 border border-red-900/30 rounded-sm space-y-6">
        <h3 className="font-medium text-red-400">Please read carefully before proceeding:</h3>

        <ul className="space-y-4 text-sm text-[var(--fs-ash)] list-disc list-inside">
          <li>
            <strong className="text-[var(--fs-ivory)]">Permanent Erasure:</strong> Your name, email, saved addresses, notification preferences, and wishlist will be permanently deleted.
          </li>
          <li>
            <strong className="text-[var(--fs-ivory)]">Number Security:</strong> Your registered mobile number ({user?.mobile || 'hidden'}) will be irreversibly hashed to ensure privacy.
          </li>
          <li>
            <strong className="text-[var(--fs-ivory)]">Order History:</strong> Previous purchase history is retained anonymously strictly for taxation and compliance audits, stripped of PII.
          </li>
          <li>
            <strong className="text-[var(--fs-ivory)]">14-Day Window:</strong> Deletion will execute exactly 14 days after this request. You will lose login access instantly.
          </li>
        </ul>

        {error && (
          <div className="bg-red-950 border border-red-900 text-red-300 px-4 py-3 rounded-sm text-sm">
            {error}
          </div>
        )}

        {step === 'DISCLAIMER' && (
          <div className="pt-6 border-t border-red-900/30">
            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="px-6 py-3 bg-red-950 text-red-400 hover:bg-red-900 hover:text-red-100 text-sm font-medium uppercase tracking-[0.1em] border border-red-900 transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Sending Request...' : 'Proceed to Verification'}
            </button>
          </div>
        )}

        {step === 'OTP' && (
          <div className="pt-6 border-t border-red-900/30 space-y-6">
            <div className="space-y-2">
              <label htmlFor="verify-otp" className="text-xs uppercase tracking-widest text-red-400 cursor-pointer">
                Verification Code Sent to {user?.mobile}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="verify-otp"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[var(--fs-void)] border border-red-900/50 focus:border-red-500 focus:outline-none rounded-sm py-3 pl-12 pr-4 text-[var(--fs-ivory)] tracking-widest"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleConfirmDeletion}
                disabled={loading || otp.length < 6}
                className="px-6 py-3 bg-red-600 text-white hover:bg-red-500 text-sm font-medium uppercase tracking-[0.1em] transition disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Confirm Account Deletion'}
              </button>
              <button
                onClick={() => setStep('DISCLAIMER')}
                disabled={loading}
                className="text-xs text-gray-400 hover:text-white uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
