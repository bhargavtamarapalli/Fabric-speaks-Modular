'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckoutStepper } from '@/components/molecules/CheckoutStepper';
import { AddressForm, AddressFormData } from '@/components/molecules/AddressForm';
import { OTPInput } from '@/components/molecules/OTPInput';
import { PaymentMethodSelector, PaymentMethod } from '@/components/molecules/PaymentMethodSelector';
import { OrderSummary, OrderSummaryData } from '@/components/molecules/OrderSummary';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { sendOtp, verifyOtp } from '@/lib/api/auth';
import { placeOrder } from '@/lib/api/orders';
import { initiateRazorpay, verifyPayment, confirmCod } from '@/lib/api/payments';

const STORAGE_KEY = 'checkout_guest_state';

const STEPS = [
  { number: 1, label: 'Address' },
  { number: 2, label: 'Verify' },
  { number: 3, label: 'Payment' },
];

const EMPTY_ADDRESS: AddressFormData = { full_name: '', mobile: '', pincode: '', line1: '', line2: '', city: '', state: '' };

const MOCK_SUMMARY: OrderSummaryData = {
  items: [{ name: 'Linen Fabric Set', qty: 1, price: 2499 }],
  subtotal: 2499, discount: 0, delivery: 0, total: 2499,
};

const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
};

export default function GuestCheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [address, setAddress] = useState<AddressFormData>(EMPTY_ADDRESS);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);

  // Load saved state
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) { const parsed = JSON.parse(saved); setAddress(parsed.address ?? EMPTY_ADDRESS); }
    } catch {}
  }, []);

  // Persist state
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ address }));
  }, [address]);

  function goNext() { setDir(1); setStep(s => s + 1); }
  function goBack() { setDir(-1); setStep(s => s - 1); }

  async function handleSendOtp() {
    setLoading(true);
    try { await sendOtp(address.mobile); goNext(); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleVerifyOtp(val: string) {
    setLoading(true);
    try {
      await verifyOtp(address.mobile, val);
      setOtpError(false);
      goNext();
    } catch { setOtpError(true); }
    finally { setLoading(false); }
  }

  async function handlePlaceOrder() {
    if (!paymentMethod) return;
    setLoading(true);
    try {
      const order = await placeOrder({
        guest_address: { ...address },
        payment_method: paymentMethod === 'COD' ? 'COD' : 'RAZORPAY',
      });

      if (paymentMethod === 'COD') {
        await confirmCod(order.id);
        sessionStorage.removeItem(STORAGE_KEY);
        router.push('/orders/confirmed');
        return;
      }

      // Razorpay flow
      const rz = await initiateRazorpay(order.id);
      // @ts-ignore
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) { alert('Razorpay SDK not loaded'); return; }
      new Razorpay({
        key: rz.key, amount: rz.amount, currency: rz.currency,
        name: rz.name, description: rz.description,
        order_id: rz.razorpay_order_id,
        handler: async (res: any) => {
          await verifyPayment({ razorpay_payment_id: res.razorpay_payment_id, razorpay_order_id: res.razorpay_order_id, razorpay_signature: res.razorpay_signature });
          sessionStorage.removeItem(STORAGE_KEY);
          router.push('/orders/confirmed');
        },
        prefill: { name: address.full_name, contact: address.mobile },
        theme: { color: '#C9A96E' },
      }).open();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  return (
    <motion.div
      initial={{ clipPath: 'inset(100% 0 0 0)' }}
      animate={{ clipPath: 'inset(0% 0 0 0)' }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      style={{ minHeight: '100vh', background: 'var(--fs-void)', padding: '24px 0' }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 28, color: 'var(--fs-ivory)', marginBottom: 4 }}>
            Fabric Speaks
          </h1>
          <p style={{ fontSize: 13, color: 'var(--fs-ash)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Guest Checkout</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'start' }}>
          {/* Left — Form */}
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
                    <h2 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 22, color: 'var(--fs-ivory)', marginBottom: 20 }}>Delivery Address</h2>
                    <AddressForm value={address} onChange={setAddress} />
                    <motion.button
                      onClick={handleSendOtp}
                      disabled={loading || !address.full_name || !address.mobile || !address.line1}
                      whileTap={{ scale: 0.97 }}
                      style={{ marginTop: 8, width: '100%', height: 52, background: 'var(--fs-linen)', color: 'var(--fs-void)', border: 'none', borderRadius: 2, fontSize: 13, fontFamily: 'var(--font-dm-sans)', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      {loading ? <SpiderLoader size="sm" /> : 'Continue →'}
                    </motion.button>
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 22, color: 'var(--fs-ivory)', marginBottom: 8 }}>Verify Mobile</h2>
                    <p style={{ fontSize: 14, color: 'var(--fs-ash)', marginBottom: 24 }}>6-digit code sent to {address.mobile.replace(/(\d{2})\d{6}(\d{2})/, '$1XXXXXX$2')}</p>
                    {loading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><SpiderLoader size="md" /></div>
                    ) : (
                      <>
                        <OTPInput value={otp} onChange={setOtp} onComplete={handleVerifyOtp} error={otpError} />
                        {otpError && <p style={{ marginTop: 8, color: 'var(--fs-error)', fontSize: 13 }}>Invalid code. Please try again.</p>}
                      </>
                    )}
                    <button onClick={goBack} style={{ marginTop: 20, background: 'none', border: 'none', color: 'var(--fs-ash)', fontSize: 13, cursor: 'pointer' }}>
                      ← Back
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 22, color: 'var(--fs-ivory)', marginBottom: 20 }}>Payment</h2>
                    <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
                    <motion.button
                      onClick={handlePlaceOrder}
                      disabled={loading || !paymentMethod}
                      whileTap={{ scale: 0.97 }}
                      style={{ marginTop: 24, width: '100%', height: 56, background: paymentMethod ? 'var(--fs-linen)' : 'var(--fs-wire)', color: paymentMethod ? 'var(--fs-void)' : 'var(--fs-ash)', border: 'none', borderRadius: 2, fontSize: 13, fontFamily: 'var(--font-dm-sans)', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: paymentMethod ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
                    >
                      {loading ? <SpiderLoader size="sm" /> : `Place Order — ₹${MOCK_SUMMARY.total.toLocaleString('en-IN')}`}
                    </motion.button>
                    <button onClick={goBack} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--fs-ash)', fontSize: 13, cursor: 'pointer', width: '100%' }}>
                      ← Back
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right — Order Summary (hidden on smallest screens) */}
          <div style={{ minWidth: 280 }}>
            <OrderSummary data={MOCK_SUMMARY} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
