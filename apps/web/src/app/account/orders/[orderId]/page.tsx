'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { OrderStatusTimeline } from '@/components/molecules/OrderStatusTimeline';
import { getOrder, cancelOrder, Order } from '@/lib/api/orders';

export default function OrderDetailPage() {
  const { orderId } = useParams() as { orderId: string };
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);

  useEffect(() => {
    getOrder(orderId).then(setOrder).finally(() => setLoading(false));
  }, [orderId]);

  const canCancel = order?.status === 'PLACED' || order?.status === 'CONFIRMED';
  const canReturn = order?.status === 'DELIVERED';

  async function handleCancel() {
    if (!order) return;
    setCancelling(true);
    try {
      const updated = await cancelOrder(order.id);
      setOrder(updated);
      setShowCancelSheet(false);
    } finally { setCancelling(false); }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--fs-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <SpiderLoader size="lg" />
    </div>
  );

  if (!order) return (
    <div style={{ minHeight: '100vh', background: 'var(--fs-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--fs-ash)', fontFamily: 'var(--font-dm-serif)', fontSize: 24 }}>Order not found.</p>
    </div>
  );

  return (
    <motion.div
      initial={{ clipPath: 'inset(100% 0 0 0)' }}
      animate={{ clipPath: 'inset(0% 0 0 0)' }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      style={{ minHeight: '100vh', background: 'var(--fs-void)', padding: 24, paddingBottom: 80 }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <Link href="/account/orders" style={{ color: 'var(--fs-ash)', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>← My Orders</Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 14, color: 'var(--fs-linen)' }}>{order.order_number}</p>
            <p style={{ fontSize: 13, color: 'var(--fs-ash)' }}>{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 18, color: 'var(--fs-ivory)', marginBottom: 16 }}>Order Status</h2>
          <OrderStatusTimeline currentStatus={order.status} />
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 18, color: 'var(--fs-ivory)', marginBottom: 16 }}>Items</h2>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: 16, borderBottom: '1px solid var(--fs-wire)', marginBottom: 16 }}>
              <div style={{ width: 72, height: 96, background: 'var(--fs-surface-2)', borderRadius: 2, flexShrink: 0, overflow: 'hidden' }}>
                {item.image_url && <img src={item.image_url} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, color: 'var(--fs-ivory)', marginBottom: 4 }}>{item.product_name}</p>
                <p style={{ fontSize: 13, color: 'var(--fs-ash)', marginBottom: 8 }}>{item.variant_label} · Qty {item.qty}</p>
                <p style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--fs-linen)', fontSize: 15 }}>₹{(item.price * item.qty).toLocaleString('en-IN')}</p>
                {canReturn && item.is_returnable && (
                  <Link href={`/account/orders/${order.id}/return`} style={{ fontSize: 13, color: 'var(--fs-linen)', textDecoration: 'none' }}>Return →</Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 28, padding: 16, background: 'var(--fs-surface-2)', borderRadius: 2, fontSize: 14, color: 'var(--fs-ash)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--fs-ivory)', display: 'block', marginBottom: 4 }}>Delivery Address</strong>
          {order.address.full_name} · {order.address.line1}, {order.address.city} — {order.address.pincode}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16, background: 'var(--fs-surface-2)', borderRadius: 2, marginBottom: 28 }}>
          <span style={{ fontSize: 14, color: 'var(--fs-ash)' }}>Payment: {order.payment_method}</span>
          <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 18, color: 'var(--fs-linen)' }}>₹{order.total.toLocaleString('en-IN')}</span>
        </div>

        {(canCancel || canReturn) && (
          <div style={{ display: 'flex', gap: 12 }}>
            {canCancel && (
              <button onClick={() => setShowCancelSheet(true)} style={{ flex: 1, height: 48, background: 'none', border: '1px solid var(--fs-error)', color: 'var(--fs-error)', borderRadius: 2, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                Cancel Order
              </button>
            )}
            {canReturn && (
              <Link href={`/account/orders/${order.id}/return`} style={{ flex: 1, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--fs-linen)', color: 'var(--fs-linen)', borderRadius: 2, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
                Initiate Return
              </Link>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCancelSheet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCancelSheet(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300 }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--fs-surface)', padding: 28, zIndex: 400 }}>
              <p style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 20, color: 'var(--fs-ivory)', marginBottom: 8 }}>Cancel {order.order_number}?</p>
              <p style={{ fontSize: 14, color: 'var(--fs-ash)', marginBottom: 24 }}>This cannot be undone. Prepaid amount refunded in 5-7 days.</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowCancelSheet(false)} style={{ flex: 1, height: 48, background: 'none', border: '1px solid var(--fs-wire)', color: 'var(--fs-ash)', borderRadius: 2, cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Back</button>
                <button onClick={handleCancel} disabled={cancelling} style={{ flex: 1, height: 48, background: 'var(--fs-error)', color: 'white', border: 'none', borderRadius: 2, cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {cancelling ? <SpiderLoader size="sm" /> : 'Yes, Cancel'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
