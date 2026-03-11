'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckoutStepper } from '@/components/molecules/CheckoutStepper';
import { AddressForm, AddressFormData } from '@/components/molecules/AddressForm';
import { PaymentMethodSelector, PaymentMethod } from '@/components/molecules/PaymentMethodSelector';
import { OrderSummary, OrderSummaryData } from '@/components/molecules/OrderSummary';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { getAddresses, Address } from '@/lib/api/addresses';
import { placeOrder } from '@/lib/api/orders';
import { initiateRazorpay, verifyPayment, confirmCod } from '@/lib/api/payments';

const STORAGE_KEY = 'checkout_auth_state';

const STEPS = [
  { number: 1, label: 'Address' },
  { number: 2, label: 'Payment' },
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

export default function AuthCheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressFormData>(EMPTY_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingAddresses, setFetchingAddresses] = useState(true);

  useEffect(() => {
    getAddresses().then(data => {
      setAddresses(data);
      const def = data.find(a => a.is_default);
      if (def) setSelectedAddressId(def.id);
    }).finally(() => setFetchingAddresses(false));
  }, []);

  function goNext() { setDir(1); setStep(s => s + 1); }
  function goBack() { setDir(-1); setStep(s => s - 1); }

  async function handlePlaceOrder() {
    if (!paymentMethod) return;
    setLoading(true);
    try {
      const order = await placeOrder({
        address_id: selectedAddressId ?? undefined,
        payment_method: paymentMethod === 'COD' ? 'COD' : 'RAZORPAY',
      });

      if (paymentMethod === 'COD') {
        await confirmCod(order.id);
        sessionStorage.removeItem(STORAGE_KEY);
        router.push('/orders/confirmed');
        return;
      }

      const rz = await initiateRazorpay(order.id);
      const Rzp = (window as any).Razorpay;
      if (!Rzp) return;
      new Rzp({
        key: rz.key, amount: rz.amount, currency: rz.currency,
        order_id: rz.razorpay_order_id,
        handler: async (res: any) => {
          await verifyPayment(res);
          router.push('/orders/confirmed');
        },
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
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 28, color: 'var(--fs-ivory)', marginBottom: 4 }}>Checkout</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'start' }}>
          <div>
            <CheckoutStepper steps={STEPS} currentStep={step} />
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={stepVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {step === 0 && (
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 22, color: 'var(--fs-ivory)', marginBottom: 20 }}>Select Delivery Address</h2>
                    {fetchingAddresses ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><SpiderLoader size="md" /></div>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                          {addresses.map(addr => (
                            <motion.div
                              key={addr.id}
                              onClick={() => { setSelectedAddressId(addr.id); setShowNewForm(false); }}
                              whileTap={{ scale: 0.98 }}
                              animate={{ borderColor: selectedAddressId === addr.id ? '#C9A96E' : '#252525', background: selectedAddressId === addr.id ? 'var(--fs-surface-2)' : 'var(--fs-surface)' }}
                              style={{ padding: 16, borderRadius: 2, border: '1px solid', cursor: 'pointer' }}
                            >
                              <div style={{ fontSize: 11, color: 'var(--fs-linen)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{addr.label}</div>
                              <div style={{ fontSize: 14, color: 'var(--fs-ivory)' }}>{addr.full_name}</div>
                              <div style={{ fontSize: 13, color: 'var(--fs-ash)', lineHeight: 1.5 }}>
                                {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                                {addr.city}, {addr.state} — {addr.pincode}
                              </div>
                            </motion.div>
                          ))}
                          {/* Add new card */}
                          <motion.div
                            onClick={() => { setShowNewForm(v => !v); setSelectedAddressId(null); }}
                            whileTap={{ scale: 0.98 }}
                            style={{ padding: 16, borderRadius: 2, border: '1px dashed var(--fs-wire)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fs-ash)', fontSize: 14 }}
                          >
                            + Add new address
                          </motion.div>
                        </div>
                        <AnimatePresence>
                          {showNewForm && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                              <AddressForm value={newAddress} onChange={setNewAddress} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <motion.button
                          onClick={goNext}
                          disabled={!selectedAddressId && !showNewForm}
                          whileTap={{ scale: 0.97 }}
                          style={{ marginTop: 12, width: '100%', height: 52, background: 'var(--fs-linen)', color: 'var(--fs-void)', border: 'none', borderRadius: 2, fontSize: 13, fontFamily: 'var(--font-dm-sans)', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}
                        >
                          Continue to Payment →
                        </motion.button>
                      </>
                    )}
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 22, color: 'var(--fs-ivory)', marginBottom: 20 }}>Payment</h2>
                    <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
                    <motion.button
                      onClick={handlePlaceOrder}
                      disabled={loading || !paymentMethod}
                      whileTap={{ scale: 0.97 }}
                      style={{ marginTop: 24, width: '100%', height: 56, background: paymentMethod ? 'var(--fs-linen)' : 'var(--fs-wire)', color: paymentMethod ? 'var(--fs-void)' : 'var(--fs-ash)', border: 'none', borderRadius: 2, fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: paymentMethod ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      {loading ? <SpiderLoader size="sm" /> : `Place Order — ₹${MOCK_SUMMARY.total.toLocaleString('en-IN')}`}
                    </motion.button>
                    <button onClick={goBack} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--fs-ash)', fontSize: 13, cursor: 'pointer', width: '100%' }}>← Back</button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div style={{ minWidth: 280 }}>
            <OrderSummary data={MOCK_SUMMARY} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
