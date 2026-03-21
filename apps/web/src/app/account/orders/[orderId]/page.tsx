'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { OrderStatusTimeline } from '@/components/molecules/OrderStatusTimeline';
import { getOrder, cancelOrder, Order } from '@/lib/api/orders';
import { useToast } from '@/context/ToastContext';
import { Loader2 } from 'lucide-react';

export default function OrderDetailPage() {
  const { orderId } = useParams() as { orderId: string };
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
        setLoading(true);
        const res = await getOrder(orderId);
        setOrder(res);
    } catch (err: any) {
        showToast(err.message || "Failed to load order details", "error");
    } finally {
        setLoading(false);
    }
  }, [orderId, showToast]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const canCancel = order?.status === 'PLACED' || order?.status === 'CONFIRMED';
  const canReturn = order?.status === 'DELIVERED';

  async function handleCancel() {
    if (!order) return;
    setCancelling(true);
    try {
      const updated = await cancelOrder(order.id);
      setOrder(updated);
      setShowCancelSheet(false);
      showToast("Order cancelled successfully", "success");
    } catch (err: any) {
        showToast(err.message || "Failed to cancel order", "error");
    } finally { 
        setCancelling(false); 
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <SpiderLoader size="lg" />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-[var(--fs-ash)] font-serif text-2xl">Order not found.</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 pb-24">
      <Link href="/account/orders" className="text-[var(--fs-ash)] text-[13px] hover:text-[var(--fs-linen)] transition-colors inline-block mb-6">
        ← Back to My Orders
      </Link>
      
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="font-mono text-sm text-[var(--fs-linen)] mb-1">{order.orderNumber}</p>
          <p className="text-[13px] text-[var(--fs-ash)]">
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mb-10">
        <h2 className="font-serif text-xl text-[var(--fs-ivory)] mb-6">Order Tracking</h2>
        <OrderStatusTimeline currentStatus={order.status} />
      </div>

      <div className="mb-10">
        <h2 className="font-serif text-xl text-[var(--fs-ivory)] mb-6">Order Items</h2>
        <div className="flex flex-col gap-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex gap-5 pb-6 border-b border-[var(--fs-wire)] last:border-0">
              <div className="w-20 h-28 bg-[var(--fs-surface-2)] flex-shrink-0 overflow-hidden">
                {item.imageUrl && <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1">
                <p className="text-[16px] text-[var(--fs-ivory)] mb-1">{item.productName}</p>
                <p className="text-[13px] text-[var(--fs-ash)] mb-6">
                    {item.variantLabel} · Qty {item.quantity}
                </p>
                <div className="flex justify-between items-end">
                    <p className="font-mono text-[var(--fs-linen)] text-[16px]">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </p>
                    {canReturn && item.isReturnable && (
                        <Link href={`/account/orders/${order.id}/return`} className="text-[12px] text-[var(--fs-linen)] uppercase tracking-widest hover:underline">
                            Return →
                        </Link>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8 p-5 bg-[var(--fs-surface-2)] border border-[var(--fs-wire)]">
        <h3 className="text-[12px] uppercase tracking-[0.2em] text-[var(--fs-linen)] mb-3">Delivery Address</h3>
        <p className="text-[14px] text-[var(--fs-ash)] leading-relaxed">
          <span className="text-[var(--fs-ivory)] font-medium">{order.address.fullName}</span><br />
          {order.address.line1}<br />
          {order.address.city}, {order.address.state} — {order.address.pincode}
        </p>
      </div>

      <div className="flex justify-between items-center p-5 bg-[var(--fs-surface-2)] border border-[var(--fs-wire)] mb-10">
        <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-widest text-[var(--fs-ash)]">Payment Method</span>
            <span className="text-[14px] text-[var(--fs-ivory)] uppercase">{order.paymentMethod}</span>
        </div>
        <div className="flex flex-col items-end">
            <span className="text-[11px] uppercase tracking-widest text-[var(--fs-ash)]">Total Paid</span>
            <span className="font-mono text-xl text-[var(--fs-linen)]">₹{order.total.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {(canCancel || canReturn) && (
        <div className="flex gap-4">
          {canCancel && (
            <button 
                onClick={() => setShowCancelSheet(true)} 
                className="flex-1 h-14 border border-[var(--fs-error)] text-[var(--fs-error)] uppercase tracking-widest text-[11px] font-semibold hover:bg-[var(--fs-error)] hover:text-white transition-all"
            >
              Cancel Order
            </button>
          )}
          {canReturn && (
            <Link href={`/account/orders/${order.id}/return`} className="flex-1 h-14 flex items-center justify-center border border-[var(--fs-linen)] text-[var(--fs-linen)] uppercase tracking-widest text-[11px] font-semibold hover:bg-[var(--fs-linen)] hover:text-[var(--fs-void)] transition-all">
              Initiate Return
            </Link>
          )}
        </div>
      )}

      <AnimatePresence>
        {showCancelSheet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCancelSheet(false)}
              className="fixed inset-0 bg-black/80 z-[300] backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-[var(--fs-surface)] p-8 z-[400] border-t border-[var(--fs-wire)]">
              <p className="font-serif text-2xl text-[var(--fs-ivory)] mb-2">Cancel {order.orderNumber}?</p>
              <p className="text-[14px] text-[var(--fs-ash)] mb-8">This action cannot be undone. Any prepaid amount will be refunded to your source account in 5-7 business days.</p>
              <div className="flex gap-4">
                <button onClick={() => setShowCancelSheet(false)} className="flex-1 h-14 border border-[var(--fs-wire)] text-[var(--fs-ash)] uppercase tracking-widest text-[11px] font-semibold">Back</button>
                <button onClick={handleCancel} disabled={cancelling} className="flex-1 h-14 bg-[var(--fs-error)] text-white uppercase tracking-widest text-[11px] font-semibold flex items-center justify-center gap-2">
                  {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
