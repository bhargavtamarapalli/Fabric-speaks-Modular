'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckoutStepper } from '@/components/molecules/CheckoutStepper';
import { AddressForm, AddressFormData } from '@/components/molecules/AddressForm';
import { PaymentMethodSelector, PaymentMethod } from '@/components/molecules/PaymentMethodSelector';
import { OrderSummary } from '@/components/molecules/OrderSummary';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { getAddresses, Address } from '@/lib/api/addresses';
import { placeOrder } from '@/lib/api/orders';
import { initiateRazorpay, verifyPayment, confirmCod } from '@/lib/api/payments';
import { getCart, Cart } from '@/lib/api/cart';
import { useToast } from '@/context/ToastContext';
import { AccountGuard } from '@/components/account/AccountGuard';
import { RazorpayOptions, RazorpayResponse } from '@/types/razorpay';

const STEPS = [
  { number: 1, label: 'Address' },
  { number: 2, label: 'Payment' },
];

const EMPTY_ADDRESS: AddressFormData = { fullName: '', mobile: '', pincode: '', line1: '', line2: '', city: '', state: '' };

const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
};

export default function AuthCheckoutPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressFormData>(EMPTY_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setFetchingData(true);
      const [cartRes, addrRes] = await Promise.all([
        getCart(),
        getAddresses()
      ]);
      setCart(cartRes);
      setAddresses(addrRes);
      const def = addrRes.find(a => a.isDefault);
      if (def) setSelectedAddressId(def.id);
    } catch (err: any) {
      showToast(err.message || "Failed to load checkout data", "error");
    } finally {
      setFetchingData(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Redirect to cart if cart is empty
  useEffect(() => {
    if (!fetchingData && (!cart || cart.items.length === 0)) {
      router.push('/cart');
    }
  }, [cart, fetchingData, router]);

  const goNext = useCallback(() => { setDir(1); setStep(s => s + 1); }, []);
  const goBack = useCallback(() => { setDir(-1); setStep(s => s - 1); }, []);

  async function handlePlaceOrder() {
    if (!paymentMethod || !cart) return;
    setLoading(true);
    try {
      const order = await placeOrder({
        addressId: selectedAddressId ?? undefined,
        paymentMethod: paymentMethod === 'COD' ? 'COD' : 'RAZORPAY',
      });

      if (paymentMethod === 'COD') {
        await confirmCod(order.id);
        router.push('/orders/confirmed');
        return;
      }

      const rz = await initiateRazorpay(order.id);
      const Rzp = window.Razorpay;
      if (!Rzp) {
        showToast("Payment gateway failed to load. Please try again.", "error");
        return;
      }

      const options: RazorpayOptions = {
        key: rz.key,
        amount: rz.amount,
        currency: rz.currency,
        order_id: rz.razorpayOrderId,
        name: rz.name,
        description: rz.description,
        handler: async (res: RazorpayResponse) => {
          try {
            await verifyPayment({
              razorpayPaymentId: res.razorpay_payment_id,
              razorpayOrderId: res.razorpay_order_id,
              razorpaySignature: res.razorpay_signature
            });
            router.push('/orders/confirmed');
          } catch (err: any) {
            showToast("Payment verification failed", "error");
          } finally {
            setLoading(false);
          }
        },
        theme: { color: '#C9A96E' },
      };

      new Rzp(options).open();
    } catch (err: any) {
      showToast(err.message || "Failed to place order", "error");
      setLoading(false);
    }
  }

  if (fetchingData) {
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
    <AccountGuard>
      <motion.div
        initial={{ clipPath: 'inset(100% 0 0 0)' }}
        animate={{ clipPath: 'inset(0% 0 0 0)' }}
        transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        className="min-h-screen bg-[var(--fs-void)] py-12"
      >
        <div className="max-w-[1100px] mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="font-serif text-3xl md:text-4xl text-[var(--fs-ivory)] mb-2">Checkout</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr,350px] gap-12 items-start">
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
                      <h2 className="font-serif text-2xl text-[var(--fs-ivory)] mb-6">Select Delivery Address</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {addresses.map(addr => (
                          <motion.div
                            key={addr.id}
                            onClick={() => { setSelectedAddressId(addr.id); setShowNewForm(false); }}
                            whileTap={{ scale: 0.98 }}
                            animate={{
                              borderColor: selectedAddressId === addr.id ? 'var(--fs-linen)' : 'var(--fs-wire)',
                              background: selectedAddressId === addr.id ? 'var(--fs-surface-2)' : 'var(--fs-surface)'
                            }}
                            className="p-5 border cursor-pointer transition-colors"
                          >
                            <div className="text-[10px] font-mono text-[var(--fs-linen)] uppercase tracking-widest mb-2">{addr.label}</div>
                            <div className="text-[15px] font-sans text-[var(--fs-ivory)] mb-1">{addr.fullName}</div>
                            <div className="text-[13px] font-sans text-[var(--fs-ash)] leading-relaxed">
                              {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                              {addr.city}, {addr.state} — {addr.pincode}
                            </div>
                          </motion.div>
                        ))}
                        <motion.div
                          onClick={() => { setShowNewForm(v => !v); setSelectedAddressId(null); }}
                          whileTap={{ scale: 0.98 }}
                          className="p-5 border border-dashed border-[var(--fs-wire)] cursor-pointer flex items-center justify-center text-[var(--fs-ash)] hover:text-[var(--fs-linen)] hover:border-[var(--fs-linen)] transition-colors"
                        >
                          + Add new address
                        </motion.div>
                      </div>

                      <AnimatePresence>
                        {showNewForm && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <AddressForm value={newAddress} onChange={setNewAddress} />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        onClick={goNext}
                        disabled={!selectedAddressId && !showNewForm}
                        className={`mt-6 w-full h-14 uppercase tracking-widest text-[13px] font-semibold transition-all ${(!selectedAddressId && !showNewForm) ? 'bg-[var(--fs-wire)] text-[var(--fs-ash)] cursor-not-allowed' : 'bg-[var(--fs-linen)] text-[var(--fs-void)] hover:opacity-90'
                          }`}
                      >
                        Continue to Payment →
                      </button>
                    </div>
                  )}

                  {step === 1 && (
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
                      <button onClick={goBack} className="mt-4 w-full text-center text-[var(--fs-ash)] text-[13px] hover:text-[var(--fs-linen)] transition-colors">← Back to Address</button>
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
    </AccountGuard>
  );
}
