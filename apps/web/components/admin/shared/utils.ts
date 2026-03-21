import { THEME } from '@/lib/admin/theme';

export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return '₹0';
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function maskMobile(mobile: string): string {
  if (!mobile) return '-';
  const m = mobile.replace('+91', '').trim();
  if (m.length < 5) return m;
  return `${m.slice(0, 2)}xxx xx${m.slice(-3)}`;
}
