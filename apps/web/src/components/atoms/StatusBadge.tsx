'use client';
import { motion } from 'framer-motion';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PLACED:             { label: 'Placed',      color: '#949494', bg: 'rgba(148,148,148,0.15)' },
  CONFIRMED:          { label: 'Confirmed',   color: '#2E86C1', bg: 'rgba(46,134,193,0.15)' },
  PACKED:             { label: 'Packed',      color: '#E67E22', bg: 'rgba(230,126,34,0.15)' },
  SHIPPED:            { label: 'Shipped',     color: '#C9A96E', bg: 'rgba(201,169,110,0.15)' },
  DELIVERED:          { label: 'Delivered',   color: '#2D6A4F', bg: 'rgba(45,106,79,0.15)' },
  CANCELLED:          { label: 'Cancelled',   color: '#B84C3C', bg: 'rgba(184,76,60,0.15)' },
  REQUESTED:          { label: 'Return Requested', color: '#E67E22', bg: 'rgba(230,126,34,0.15)' },
  APPROVED:           { label: 'Return Approved',  color: '#2D6A4F', bg: 'rgba(45,106,79,0.15)' },
  RESOLVED_REFUNDED:  { label: 'Refunded',    color: '#2D6A4F', bg: 'rgba(45,106,79,0.15)' },
  RESOLVED_REPLACED:  { label: 'Replaced',    color: '#C9A96E', bg: 'rgba(201,169,110,0.15)' },
};

interface StatusBadgeProps { status: string; }

/**
 * Display badge for order and return statuses.
 * Includes a subtle pulse animation for "SHIPPED" status.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = statusConfig[status] ?? { label: status, color: '#949494', bg: 'rgba(148,148,148,0.15)' };
  const pulse = status === 'SHIPPED';
  
  return (
    <motion.span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 2,
        fontSize: 11,
        fontFamily: 'var(--font-dm-mono)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}40`,
        position: 'relative',
      }}
      animate={pulse ? { opacity: [1, 0.6, 1] } : {}}
      transition={pulse ? { duration: 2, repeat: Infinity } : {}}
    >
      {cfg.label}
    </motion.span>
  );
}
