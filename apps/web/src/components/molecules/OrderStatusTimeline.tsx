'use client';
import { motion } from 'framer-motion';
import { OrderStatus } from '@/lib/api/orders';

const TIMELINE_STEPS: OrderStatus[] = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'];

const LABELS: Record<string, string> = {
  PLACED: 'Order Placed', CONFIRMED: 'Confirmed', PACKED: 'Packed',
  SHIPPED: 'Shipped', DELIVERED: 'Delivered',
};

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  timestamps?: Partial<Record<OrderStatus, string>>;
}

export function OrderStatusTimeline({ currentStatus, timestamps = {} }: OrderStatusTimelineProps) {
  const currentIdx = TIMELINE_STEPS.indexOf(currentStatus);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const pending = i > currentIdx;

        return (
          <div key={step} style={{ display: 'flex', gap: 16 }}>
            {/* Node column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.2, type: 'spring' }}
                style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  background: done ? '#C9A96E' : active ? '#C9A96E' : 'transparent',
                  border: `2px solid ${done || active ? '#C9A96E' : '#252525'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {done && <span style={{ fontSize: 7, color: '#0A0A0A' }}>✓</span>}
                {active && (
                  <motion.div
                    animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', border: '2px solid #C9A96E' }}
                  />
                )}
              </motion.div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div style={{ flex: 1, width: 2, background: done ? '#C9A96E' : '#252525', minHeight: 32, margin: '4px 0' }} />
              )}
            </div>
            {/* Text column */}
            <motion.div
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.2 }}
              style={{ paddingBottom: i < TIMELINE_STEPS.length - 1 ? 24 : 0 }}
            >
              <div style={{ fontSize: 14, color: pending ? 'var(--fs-ash)' : 'var(--fs-ivory)', fontWeight: active ? 600 : 400 }}>
                {LABELS[step]}
              </div>
              {timestamps[step] && (
                <div style={{ fontSize: 12, color: 'var(--fs-ash)', marginTop: 2 }}>
                  {new Date(timestamps[step]!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
