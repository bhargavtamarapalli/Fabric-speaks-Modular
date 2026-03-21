/**
 * Type definitions for Razorpay payment integration
 */

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
    hide_topbar?: boolean;
  };
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

/**
 * Razorpay payment failure response
 */
export interface RazorpayPaymentFailed {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: {
      order_id?: string;
      payment_id?: string;
    };
  };
}

/**
 * Razorpay event types
 */
export type RazorpayEvent =
  | 'payment.failed'
  | 'payment.success'
  | 'modal.close';

/**
 * Handler types for Razorpay events
 */
export type RazorpayEventHandler<TEvent extends RazorpayEvent> =
  TEvent extends 'payment.success' ? (response: RazorpayResponse) => void
  : TEvent extends 'payment.failed' ? (response: RazorpayPaymentFailed) => void
  : () => void;

/**
 * Razorpay instance returned by `new Razorpay(options)`
 */
export interface RazorpayInstance {
  open: () => void;
  on: <TEvent extends RazorpayEvent>(event: TEvent, handler: RazorpayEventHandler<TEvent>) => void;
  close: () => void;
}

/**
 * Extended window interface for Razorpay
 */
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export { };
