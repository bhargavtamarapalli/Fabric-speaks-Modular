'use client';
import { motion } from 'framer-motion';

export interface OrderSummaryData {
  items: { name: string; qty: number; price: number; image_url?: string }[];
  subtotal: number;
  discount?: number;
  delivery: number;
  total: number;
  coupon_code?: string;
}

interface OrderSummaryProps {
  data: OrderSummaryData;
  compact?: boolean;
}

export function OrderSummary({ data, compact = false }: OrderSummaryProps) {
  return (
    <div style={{ background: 'var(--fs-surface-2)', border: '1px solid var(--fs-wire)', borderRadius: 2, padding: 20 }}>
      {!compact && (
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--fs-wire)' }}>
          {data.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              {it.image_url && (
                <div style={{ width: 48, height: 64, background: 'var(--fs-wire)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={it.image_url} alt={it.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: 'var(--fs-ivory)' }}>{it.name}</div>
                <div style={{ fontSize: 12, color: 'var(--fs-ash)' }}>Qty {it.qty}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-dm-mono)', color: 'var(--fs-linen)', fontSize: 14 }}>
                ₹{(it.price * it.qty).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row label="Subtotal" value={`₹${data.subtotal.toLocaleString('en-IN')}`} />
        {data.discount && <Row label={`Discount${data.coupon_code ? ` (${data.coupon_code})` : ''}`} value={`-₹${data.discount.toLocaleString('en-IN')}`} valueColor="var(--fs-error)" />}
        <Row label="Delivery" value={data.delivery === 0 ? 'Free' : `₹${data.delivery}`} />
        <div style={{ height: 1, background: 'var(--fs-wire)', margin: '4px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 14, color: 'var(--fs-ivory)', fontWeight: 600 }}>Total</span>
          <motion.span
            key={data.total}
            initial={{ scale: 1.1, color: '#C9A96E' }}
            animate={{ scale: 1, color: '#C9A96E' }}
            style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 20, color: 'var(--fs-linen)', fontWeight: 700 }}
          >
            ₹{data.total.toLocaleString('en-IN')}
          </motion.span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--fs-ash)' }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'var(--font-dm-mono)', color: valueColor ?? 'var(--fs-ivory)' }}>{value}</span>
    </div>
  );
}
