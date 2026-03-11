'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { getOrders, Order, OrderStatus } from '@/lib/api/orders';

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All',       value: '' },
  { label: 'Placed',    value: 'PLACED' },
  { label: 'Shipped',   value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: (i: number) => ({ y: 0, opacity: 1, transition: { delay: i * 0.06, duration: 0.4 } }),
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    getOrders({ status: activeFilter || undefined, limit: 20 })
      .then(res => setOrders(res.items))
      .finally(() => setLoading(false));
  }, [activeFilter]);

  return (
    <motion.div
      initial={{ clipPath: 'inset(100% 0 0 0)' }}
      animate={{ clipPath: 'inset(0% 0 0 0)' }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      style={{ minHeight: '100vh', background: 'var(--fs-void)', padding: 24 }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 32, color: 'var(--fs-ivory)', marginBottom: 24 }}>My Orders</h1>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, overflowX: 'auto' }}>
          {STATUS_FILTERS.map(f => (
            <motion.button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              whileTap={{ scale: 0.95 }}
              animate={{ background: activeFilter === f.value ? '#C9A96E' : 'transparent', color: activeFilter === f.value ? '#0A0A0A' : '#6B6560' }}
              style={{ padding: '8px 16px', borderRadius: 2, border: '1px solid', borderColor: activeFilter === f.value ? '#C9A96E' : '#252525', fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {f.label}
            </motion.button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><SpiderLoader size="md" /></div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 24, color: 'var(--fs-ash)' }}>No orders yet.</p>
            <Link href="/shop" style={{ marginTop: 16, display: 'inline-block', color: 'var(--fs-linen)', fontSize: 14 }}>Start shopping →</Link>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeFilter} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.map((order, i) => (
                <motion.div
                  key={order.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Link href={`/account/orders/${order.id}`} style={{ textDecoration: 'none', display: 'block', padding: 20, background: 'var(--fs-surface)', border: '1px solid var(--fs-wire)', borderRadius: 2, transition: 'border-color 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      {/* Thumbnail */}
                      <div style={{ width: 72, height: 96, background: 'var(--fs-surface-2)', borderRadius: 2, flexShrink: 0, overflow: 'hidden' }}>
                        {order.items[0]?.image_url && <img src={order.items[0].image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      {/* Details */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 13, color: 'var(--fs-ash)' }}>{order.order_number}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--fs-ash)', marginBottom: 8 }}>
                          {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 18, color: 'var(--fs-linen)' }}>
                            ₹{order.total.toLocaleString('en-IN')}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--fs-linen)' }}>View Details →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
