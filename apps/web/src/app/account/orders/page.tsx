'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { getOrders, Order } from '@/lib/api/orders';
import { useToast } from '@/context/ToastContext';

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
  const { showToast } = useToast();

  const fetchOrders = useCallback(async () => {
    try {
        setLoading(true);
        const res = await getOrders({ status: activeFilter as any || undefined, limit: 20 });
        setOrders(res.items);
    } catch (err: any) {
        showToast(err.message || "Failed to load orders", "error");
    } finally {
        setLoading(false);
    }
  }, [activeFilter, showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="font-serif text-3xl text-[var(--fs-ivory)] mb-8">My Orders</h1>

      {/* Filter chips */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {STATUS_FILTERS.map(f => (
          <motion.button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            whileTap={{ scale: 0.95 }}
            animate={{ 
                background: activeFilter === f.value ? 'var(--fs-linen)' : 'transparent', 
                color: activeFilter === f.value ? 'var(--fs-void)' : 'var(--fs-ash)' 
            }}
            className={`px-4 py-2 rounded-sm border ${activeFilter === f.value ? 'border-[var(--fs-linen)]' : 'border-[var(--fs-wire)]'} text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors`}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><SpiderLoader size="md" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 border border-[var(--fs-wire)] border-dashed rounded-sm">
          <p className="font-serif text-2xl text-[var(--fs-ash)] mb-4">No orders found.</p>
          <Link href="/products" className="text-[var(--fs-linen)] text-sm hover:underline">Start shopping →</Link>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={activeFilter} className="flex flex-col gap-4">
            {orders.map((order, i) => (
              <motion.div
                key={order.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Link href={`/account/orders/${order.id}`} className="block p-5 bg-[var(--fs-surface)] border border-[var(--fs-wire)] hover:border-[var(--fs-linen)] transition-colors group">
                  <div className="flex gap-5">
                    {/* Thumbnail */}
                    <div className="w-20 h-28 bg-[var(--fs-surface-2)] flex-shrink-0 overflow-hidden">
                      {order.items[0]?.imageUrl && <img src={order.items[0].imageUrl} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />}
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[13px] text-[var(--fs-ash)]">{order.orderNumber}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-[13px] text-[var(--fs-ash)] mb-8">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="font-mono text-lg text-[var(--fs-linen)]">
                          ₹{order.total.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] uppercase tracking-widest text-[var(--fs-linen)]">View Details →</span>
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
  );
}
