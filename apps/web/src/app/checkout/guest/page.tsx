'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckoutStepper } from '@/components/molecules/CheckoutStepper';
import { AddressForm, AddressFormData } from '@/components/molecules/AddressForm';
import { OTPInput } from '@/components/molecules/OTPInput';
import { PaymentMethodSelector, PaymentMethod } from '@/components/molecules/PaymentMethodSelector';
import { OrderSummary } from '@/components/molecules/OrderSummary';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { sendOtp, verifyOtp } from '@/lib/api/auth';
import { placeOrder } from '@/lib/api/orders';
import { initiateRazorpay, verifyPayment, confirmCod } from '@/lib/api/payments';
import { getCart, Cart } from '@/lib/api/cart';
import { useToast } from '@/context/ToastContext';
import { RazorpayOptions, RazorpayResponse } from '@/types/razorpay';

const STORAGE_KEY = 'checkout_guest_state';

const STEPS = [
  { number: 1, label: 'Address' },
  { number: 2, label: 'Verify' },
  { number: 3, label: 'Payment' },
];

const EMPTY_ADDRESS: AddressFormData = { fullName: '', mobile: '', pincode: '', line1: '', line2: '', city: '', state: '' };

const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
};

export default function GuestCheckoutPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [cart, setCart] = useState<Cart | null>(null);
  const [address, setAddress] = useState<AddressFormData>(EMPTY_ADDRESS);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingCart, setFetchingCart] = useState(true);

  const fetchCartData = useCallback(async () => {
    try {
      setFetchingCart(true);
      const res = await getCart();
      setCart(res);
    } catch (err: any) {
      showToast(err.message || "Failed to load cart", "error");
    } finally {
      setFetchingCart(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCartData();
  }, [fetchCartData]);

  // Redirect to cart if cart is empty
  useEffect(() => {
    if (!fetchingCart && (!cart || cart.items.length === 0)) {
      router.push('/cart');
    }
  }, [cart, fetchingCart, router]);

  // Load saved address
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.address) setAddress(parsed.address);
      }
    } catch { }
  }, []);

  // Persist address
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ address }));
  }, [address]);

  function goNext() { setDir(1); setStep(s => s + 1); }
  function goBack() { setDir(-1); setStep(s => s - 1); }

  async function handleSendOtp() {
    setLoading(true);
    try {
      await sendOtp(address.mobile);
      goNext();
    }
    catch (err: any) {
      showToast(err.message || "Failed to send OTP", "error");
    }
    finally { setLoading(false); }
  }

  async function handleVerifyOtp(val: string) {
    setLoading(true);
    try {
      await verifyOtp(address.mobile, val);
      setOtpError(false);
      goNext();
    } catch {
      setOtpError(true);
    }
    finally { setLoading(false); }
  }

  async function handlePlaceOrder() {
    if (!paymentMethod || !cart) return;
    setLoading(true);
    try {
      const order = await placeOrder({
        guestAddress: { ...address },
        paymentMethod: paymentMethod === 'COD' ? 'COD' : 'RAZORPAY',
      });

      if (paymentMethod === 'COD') {
        await confirmCod(order.id);
        sessionStorage.removeItem(STORAGE_KEY);
        router.push('/orders/confirmed');
        return;
      }

      const rz = await initiateRazorpay(order.id);
      const Rzp = window.Razorpay;
      if (!Rzp) {
        showToast("Payment gateway failed to load", "error");
        return;
      }
      const options: RazorpayOptions = {
        key: rz.key,
        amount: rz.amount,
        currency: rz.currency,
        name: rz.name,
        description: rz.description,
        order_id: rz.razorpayOrderId,
        handler: async (res: RazorpayResponse) => {
          try {
            await verifyPayment({
              razorpayPaymentId: res.razorpay_payment_id,
              razorpayOrderId: res.razorpay_order_id,
              razorpaySignature: res.razorpay_signature
            });
            sessionStorage.removeItem(STORAGE_KEY);
            router.push('/orders/confirmed');
          } catch (err: any) {
            showToast("Payment verification failed", "error");
          }
        },
        prefill: { name: address.fullName, contact: address.mobile },
        theme: { color: '#C9A96E' },
      };
      new Rzp(options).open();
    } catch (err: any) {
      showToast(err.message || "Failed to place order", "error");
    }
    finally { setLoading(false); }
  }

  if (fetchingCart) {
    return (
      <div className="min-h-screen bg-[var(--fs-void)] flex items-center justify-center">
        <SpiderLoader size="lg" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    // Redirect is handled by useEffect above
    return null;
  }

  const summaryData = {
    items: cart.items.map(item => ({ name: item.productName, qty: item.quantity, price: (item.isSaleActive && item.salePrice ? item.salePrice : item.price) })),
    subtotal: cart.subtotal,
    discount: cart.discount,
    delivery: cart.shipping,
    total: cart.total
  };

  return (
    <motion.div
      initial={{ clipPath: 'inset(100% 0 0 0)' }}
      animate={{ clipPath: 'inset(0% 0 0 0)' }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      className="min-h-screen bg-[var(--fs-void)] py-12"
    >
      <div className="max-w-[1000px] mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl text-[var(--fs-ivory)] mb-2">Fabric Speaks</h1>
          <p className="text-[11px] font-mono text-[var(--fs-ash)] uppercase tracking-widest">Guest Checkout</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,350px] gap-12 items-start">
          <div>
            <CheckoutStepper steps={STEPS} currentStep={step} />
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {step === 0 && (
                  <div>
                    <h2 className="font-serif text-2xl text-[var(--fs-ivory)] mb-6">Delivery Address</h2>
                    <AddressForm value={address} onChange={setAddress} />
                    <button
                      onClick={handleSendOtp}
                      disabled={loading || !address.fullName || !address.mobile || !address.line1}
                      className={`mt-4 w-full h-14 uppercase tracking-widest text-[13px] font-semibold flex items-center justify-center gap-3 transition-all ${(loading || !address.fullName || !address.mobile || !address.line1) ? 'bg-[var(--fs-wire)] text-[var(--fs-ash)] cursor-not-allowed' : 'bg-[var(--fs-linen)] text-[var(--fs-void)] hover:opacity-90'
                        }`}
                    >
                      {loading ? <SpiderLoader size="sm" /> : 'Continue →'}
                    </button>
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <h2 className="font-serif text-2xl text-[var(--fs-ivory)] mb-2">Verify Mobile</h2>
                    <p className="text-[14px] text-[var(--fs-ash)] mb-8">6-digit code sent to {address.mobile.replace(/(\d{2})\d{6}(\d{2})/, '$1XXXXXX$2')}</p>
                    {loading ? (
                      <div className="flex justify-center py-12"><SpiderLoader size="md" /></div>
                    ) : (
                      <>
                        <div aria-live="polite" aria-atomic="true">
                          <OTPInput value={otp} onChange={setOtp} onComplete={handleVerifyOtp} error={otpError} />
                        </div>
                        {otpError && <p id="otp-error" className="mt-4 text-[var(--fs-error)] text-[13px]" role="alert">Invalid code. Please try again.</p>}
                      </>
                    )}
                    <button onClick={goBack} className="mt-8 text-[var(--fs-ash)] text-[13px] hover:text-[var(--fs-linen)] transition-colors">← Back to Address</button>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h2 className="font-serif text-2xl text-[var(--fs-ivory)] mb-6">Payment Method</h2>
                    <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
                    <button
                      onClick={handlePlaceOrder}
                      disabled={loading || !paymentMethod}
                      className={`mt-8 w-full h-14 uppercase tracking-widest text-[13px] font-semibold flex items-center justify-center gap-3 transition-all ${(loading || !paymentMethod) ? 'bg-[var(--fs-wire)] text-[var(--fs-ash)] cursor-not-allowed' : 'bg-[var(--fs-linen)] text-[var(--fs-void)] hover:opacity-90'
                        }`}
                    >
                      {loading ? <SpiderLoader size="sm" /> : `Place Order — ₹${cart.total.toLocaleString('en-IN')}`}
                    </button>
                    <button onClick={goBack} className="mt-4 w-full text-center text-[var(--fs-ash)] text-[13px] hover:text-[var(--fs-linen)] transition-colors">← Back to Verify</button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="sticky top-24">
            <OrderSummary data={summaryData} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
