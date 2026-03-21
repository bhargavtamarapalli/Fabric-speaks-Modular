'use client';

import { useState, useCallback, useEffect } from 'react';
import { ordersApi } from '@/lib/admin/api';
import type { Order, OrderTimeline } from '@/lib/admin/types';
import { useToast, formatCurrency } from '@/components/admin/shared';

export const CANCEL_INITIAL = {
  reason: '',
  note: '',
};

export type CancelForm = typeof CANCEL_INITIAL;

export function useOrderDetail(orderId: string | undefined) {
  const { showToast } = useToast();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<OrderTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelForm, setCancelForm] = useState<CancelForm>(CANCEL_INITIAL);
  const [cancelErrors, setCancelErrors] = useState<Partial<Record<keyof CancelForm, string>>>({});
  const [cancelLoading, setCancelLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      setError(null);
      setLoading(true);
      const [orderRes, timelineRes] = await Promise.all([
        ordersApi.getById(orderId),
        ordersApi.getTimeline(orderId),
      ]);
      setOrder(orderRes);
      setTimeline(timelineRes);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const handleCancelReview = useCallback(() => {
    const errs = {
      reason: cancelForm.reason.trim() ? '' : 'Reason is required',
      note: '',
    };
    if (Object.values(errs).some(Boolean)) {
      setCancelErrors(errs);
      return;
    }
    setConfirmOpen(true);
  }, [cancelForm]);

  const handleCancelConfirm = useCallback(async () => {
    if (!order) return;
    try {
      setCancelLoading(true);
      const message = cancelForm.note.trim()
        ? `${cancelForm.reason.trim()} — ${cancelForm.note.trim()}`
        : cancelForm.reason.trim();
      await ordersApi.cancel(order.id, message);
      showToast('Order cancelled', 'success');
      setConfirmOpen(false);
      setCancelOpen(false);
      setCancelForm(CANCEL_INITIAL);
      setCancelErrors({});
      load();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to cancel order', 'error');
    } finally {
      setCancelLoading(false);
    }
  }, [order, cancelForm, load, showToast]);

  const handlePrint = useCallback(async () => {
    if (!order) return;
    try {
      setPrintLoading(true);
      const slip = await ordersApi.getPackingSlip(order.id);
      const win = window.open('', '_blank');
      if (!win) {
        showToast('Popup blocked. Please allow popups to print.', 'error');
        return;
      }
      const rows = slip.items
        .map(item => `
          <tr>
            <td>${item.productName}</td>
            <td>${item.size}</td>
            <td>${item.colour}</td>
            <td>${item.qty}</td>
            <td>${formatCurrency(item.unitPrice)}</td>
          </tr>
        `)
        .join('');
      win.document.write(`
        <html>
          <head>
            <title>Packing Slip ${slip.orderNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; }
              h1 { font-size: 18px; margin: 0 0 8px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
              th { background: #f5f5f5; text-align: left; }
              .meta { margin-top: 8px; font-size: 12px; color: #333; }
            </style>
          </head>
          <body>
            <h1>Packing Slip</h1>
            <div class="meta"><strong>Order:</strong> ${slip.orderNumber}</div>
            <div class="meta"><strong>Date:</strong> ${slip.orderDate}</div>
            <div class="meta"><strong>Customer:</strong> ${slip.customer.name} (${slip.customer.phone})</div>
            <div class="meta"><strong>Address:</strong> ${slip.customer.address}</div>
            <table>
              <thead>
                <tr>
                  <th>Item</th><th>Size</th><th>Colour</th><th>Qty</th><th>Price</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="meta"><strong>Total items:</strong> ${slip.totalItems}</div>
            <div class="meta"><strong>Payment:</strong> ${slip.paymentMethod}</div>
            ${slip.codAmount ? '<div class="meta"><strong>COD Amount:</strong> ' + formatCurrency(slip.codAmount) + '</div>' : ''}
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
    } catch (e: any) {
      showToast(e.message ?? 'Failed to fetch packing slip', 'error');
    } finally {
      setPrintLoading(false);
    }
  }, [order, showToast]);

  return {
    order,
    timeline,
    loading,
    error,
    cancelOpen,
    setCancelOpen,
    confirmOpen,
    setConfirmOpen,
    cancelForm,
    setCancelForm,
    cancelErrors,
    setCancelErrors,
    cancelLoading,
    printLoading,
    handleCancelReview,
    handleCancelConfirm,
    handlePrint,
    load,
  };
}
