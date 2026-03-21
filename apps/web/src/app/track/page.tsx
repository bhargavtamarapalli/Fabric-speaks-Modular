'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OTPInput } from '@/components/molecules/OTPInput';
import { OrderStatusTimeline } from '@/components/molecules/OrderStatusTimeline';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { sendOtp } from '@/lib/api/auth';
import { trackGuestOrder, Order } from '@/lib/api/orders';

export default function GuestTrackPage() {
  const [mobile, setMobile] = useState('');
  const [orderId, setOrderId] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  async function handleSendOtp() {
    if (!mobile || !orderId) return;
    setLoading(true);
    try { await sendOtp(mobile); setOtpSent(true); }
    catch (e) { setError('Could not send OTP. Check your mobile number.'); }
    finally { setLoading(false); }
  }

  async function handleVerify(val: string) {
    setLoading(true);
    try {
      const result = await trackGuestOrder(mobile, orderId, val);
      setOrder(result);
    } catch { setError('Invalid code or order not found.'); }
    finally { setLoading(false); }
  }

  return (
    <motion.div
      initial={{ clipPath: 'inset(100% 0 0 0)' }}
      animate={{ clipPath: 'inset(0% 0 0 0)' }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      style={{ minHeight: '100vh', background: 'var(--fs-void)', padding: 24 }}
    >
      <div style={{ maxWidth: 520, margin: '48px auto' }}>
        <h1 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 32, color: 'var(--fs-ivory)', marginBottom: 8, textAlign: 'center' }}>Track Order</h1>
        <p style={{ fontSize: 14, color: 'var(--fs-ash)', textAlign: 'center', marginBottom: 40 }}>Enter your mobile and order ID to view live status.</p>

        {!order && (
          <div style={{ background: 'var(--fs-surface)', border: '1px solid var(--fs-wire)', borderRadius: 2, padding: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--fs-ash)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Mobile Number</label>
              <input value={mobile} onChange={e => setMobile(e.target.value)} type="tel" placeholder="+91 98XXXXXXXX"
                style={{ width: '100%', height: 48, padding: '0 12px', background: 'transparent', border: '1px solid var(--fs-wire)', borderRadius: 2, color: 'var(--fs-ivory)', fontSize: 15, outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--fs-ash)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Order ID</label>
              <input value={orderId} onChange={e => setOrderId(e.target.value)} type="text" placeholder="FS-XXXXXXXX"
                style={{ width: '100%', height: 48, padding: '0 12px', background: 'transparent', border: '1px solid var(--fs-wire)', borderRadius: 2, color: 'var(--fs-ivory)', fontSize: 15, fontFamily: 'var(--font-dm-mono)', outline: 'none' }}
              />
            </div>

            <AnimatePresence>
              {otpSent && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 13, color: 'var(--fs-ash)', marginBottom: 12 }}>Code sent to {mobile.replace(/(\d{2})\d{6}(\d{2})/, '$1XXXXXX$2')}</p>
                  <OTPInput value={otp} onChange={setOtp} onComplete={handleVerify} />
                </motion.div>
              )}
            </AnimatePresence>

            {error && <p style={{ color: 'var(--fs-error)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}><SpiderLoader size="md" /></div>
            ) : (
              <motion.button
                onClick={otpSent ? () => handleVerify(otp) : handleSendOtp}
                whileTap={{ scale: 0.97 }}
                style={{ width: '100%', height: 52, background: 'var(--fs-linen)', color: 'var(--fs-void)', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                {otpSent ? 'Track My Order' : 'Send OTP'}
              </motion.button>
            )}
          </div>
        )}

        {order && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'var(--fs-surface)', border: '1px solid var(--fs-wire)', borderRadius: 2, padding: 32, marginTop: 24 }}>
            <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--fs-wire)' }}>
              <p style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 16, color: 'var(--fs-linen)', marginBottom: 4 }}>{order.orderNumber}</p>
              <p style={{ fontSize: 13, color: 'var(--fs-ash)' }}>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <OrderStatusTimeline currentStatus={order.status} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
