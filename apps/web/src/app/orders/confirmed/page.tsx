'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { getLatestOrder } from '@/lib/api/orders';
import { optInWhatsApp } from '@/lib/api/returns';

export default function OrderConfirmationPage() {
  const [order, setOrder] = useState<any>(null);
  const [waConsent, setWaConsent] = useState(false);
  const [showWA, setShowWA] = useState(false);
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    getLatestOrder().then(o => setOrder(o)).catch(() => {});
    const t = setTimeout(() => setShowWA(true), 1200);
    const t2 = setTimeout(() => setConfetti(false), 2000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  async function toggleWA(v: boolean) {
    setWaConsent(v);
    if (order) await optInWhatsApp(order.id, v).catch(() => {});
  }

  return (
    <motion.div
      initial={{ clipPath: 'inset(100% 0 0 0)' }}
      animate={{ clipPath: 'inset(0% 0 0 0)' }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      style={{ minHeight: '100vh', background: 'var(--fs-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}
    >
      {/* Confetti */}
      {confetti && Array.from({ length: 12 }, (_, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', width: 6, height: 6, borderRadius: '50%', background: '#C9A96E', top: '50%', left: '50%' }}
          animate={{ x: Math.cos(i * 30 * Math.PI / 180) * 200, y: Math.sin(i * 30 * Math.PI / 180) * 200, opacity: [1, 0] }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      ))}

      <div style={{ textAlign: 'center', maxWidth: 480, width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Spider checkmark */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          {!order ? (
            <SpiderLoader size="lg" />
          ) : (
            <motion.svg viewBox="0 0 60 60" width={60} height={60}>
              <motion.circle cx="30" cy="30" r="26" stroke="#C9A96E" strokeWidth="2" fill="none"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }}
              />
              <motion.path d="M18 30 l8 8 l16-16" stroke="#C9A96E" strokeWidth="2.5" fill="none" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.4 }}
              />
            </motion.svg>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 20, color: 'var(--fs-linen)', letterSpacing: '0.08em', marginBottom: 8 }}>
            {order ? `Order #${order.order_number}` : '…'}
          </p>
          <h1 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 32, color: 'var(--fs-ivory)', marginBottom: 8 }}>
            Your order is confirmed.
          </h1>
          {order?.estimated_delivery && (
            <p style={{ fontSize: 14, color: 'var(--fs-ash)', marginBottom: 24 }}>
              📅 Arrives by {new Date(order.estimated_delivery).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          )}
        </motion.div>

        {/* WhatsApp Card */}
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={showWA ? { y: 0, opacity: 1 } : { y: 60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ marginBottom: 32, padding: '16px 20px', background: 'var(--fs-surface)', border: '1px solid var(--fs-wire)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 16 }}
        >
          <div style={{ fontSize: 28 }}>💬</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 14, color: 'var(--fs-ivory)', marginBottom: 2 }}>Get order updates on WhatsApp</div>
            <div style={{ fontSize: 12, color: 'var(--fs-ash)' }}>Dispatch, tracking, and delivery alerts</div>
          </div>
          <motion.div
            onClick={() => toggleWA(!waConsent)}
            style={{ width: 44, height: 24, borderRadius: 12, background: waConsent ? 'var(--fs-linen)' : 'var(--fs-wire)', cursor: 'pointer', position: 'relative', transition: 'background 0.25s' }}
          >
            <motion.div
              animate={{ x: waConsent ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: waConsent ? '#0A0A0A' : '#6B6560' }}
            />
          </motion.div>
        </motion.div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href={order ? `/track` : '#'} style={{ padding: '14px 28px', border: '1px solid var(--fs-linen)', color: 'var(--fs-linen)', borderRadius: 2, textDecoration: 'none', fontSize: 13, fontFamily: 'var(--font-dm-sans)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Track Order
          </Link>
          <Link href="/shop" style={{ padding: '14px 28px', background: 'var(--fs-linen)', color: 'var(--fs-void)', borderRadius: 2, textDecoration: 'none', fontSize: 13, fontFamily: 'var(--font-dm-sans)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
