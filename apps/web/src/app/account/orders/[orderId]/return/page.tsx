'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { CheckoutStepper } from '@/components/molecules/CheckoutStepper';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { getOrder, Order, OrderItem } from '@/lib/api/orders';
import { initiateReturn } from '@/lib/api/returns';

const STEPS = [
  { number: 1, label: 'Items' },
  { number: 2, label: 'Reason' },
  { number: 3, label: 'Type' },
  { number: 4, label: 'Review' },
];

const RETURN_REASONS = ['Size issue', 'Wrong item received', 'Damaged / defective', 'Changed my mind', 'Other'];

const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
};

export default function ReturnPortalPage() {
  const { orderId } = useParams() as { orderId: string };
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [returnType, setReturnType] = useState<'refund' | 'store_credit' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [returnId, setReturnId] = useState('');

  useEffect(() => {
    getOrder(orderId).then(setOrder).finally(() => setLoading(false));
  }, [orderId]);

  function goNext() { setDir(1); setStep(s => s + 1); }
  function goBack() { setDir(-1); setStep(s => s - 1); }
  function toggleItem(id: string) {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    if (!returnType) return;
    setSubmitting(true);
    try {
      const combinedReason = Object.values(reasons).join('; ');
      const ret = await initiateReturn(orderId, combinedReason);
      setReturnId(ret.id);
      setSubmitted(true);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--fs-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <SpiderLoader size="lg" />
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: 'var(--fs-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(45,106,79,0.2)', border: '2px solid var(--fs-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✓</div>
        </motion.div>
        <h1 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 28, color: 'var(--fs-ivory)', marginBottom: 8 }}>Return Initiated</h1>
        <p style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 14, color: 'var(--fs-linen)', marginBottom: 16 }}>#{returnId}</p>
        <p style={{ fontSize: 14, color: 'var(--fs-ash)', marginBottom: 32 }}>Our team will schedule a pickup within 24 hours. You'll get a WhatsApp update.</p>
        <motion.button onClick={() => router.push('/account/orders')} whileTap={{ scale: 0.97 }}
          style={{ padding: '14px 32px', background: 'var(--fs-linen)', color: 'var(--fs-void)', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Back to Orders
        </motion.button>
      </div>
    </div>
  );

  const returnableItems = order?.items.filter(i => i.isReturnable) ?? [];

  return (
    <motion.div initial={{ clipPath: 'inset(100% 0 0 0)' }} animate={{ clipPath: 'inset(0% 0 0 0)' }} transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      style={{ minHeight: '100vh', background: 'var(--fs-void)', padding: 24 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 28, color: 'var(--fs-ivory)', marginBottom: 8 }}>Return Portal</h1>
        <p style={{ fontSize: 13, color: 'var(--fs-ash)', marginBottom: 32, fontFamily: 'var(--font-dm-mono)' }}>{order?.orderNumber}</p>
        <CheckoutStepper steps={STEPS} currentStep={step} />

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeOut' }}>

            {/* Step 1 — Select Items */}
            {step === 0 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 20, color: 'var(--fs-ivory)', marginBottom: 20 }}>Which items are you returning?</h2>
                {returnableItems.length === 0 ? (
                  <p style={{ color: 'var(--fs-ash)', fontSize: 14 }}>No returnable items in this order.</p>
                ) : (
                  returnableItems.map(item => (
                    <motion.div key={item.id} onClick={() => toggleItem(item.id)} whileTap={{ scale: 0.99 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, marginBottom: 12, background: selectedItems.includes(item.id) ? 'var(--fs-surface-2)' : 'var(--fs-surface)', border: `1px solid ${selectedItems.includes(item.id) ? '#C9A96E' : '#252525'}`, borderRadius: 2, cursor: 'pointer' }}>
                      <motion.div animate={{ scale: selectedItems.includes(item.id) ? 1.15 : 1 }} transition={{ type: 'spring' }}
                        style={{ width: 20, height: 20, borderRadius: 2, border: `2px solid ${selectedItems.includes(item.id) ? '#C9A96E' : '#252525'}`, background: selectedItems.includes(item.id) ? '#C9A96E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A', fontSize: 13, flexShrink: 0 }}>
                        {selectedItems.includes(item.id) && '✓'}
                      </motion.div>
                      <div style={{ width: 56, height: 72, background: 'var(--fs-wire)', borderRadius: 2, flexShrink: 0, overflow: 'hidden' }}>
                        {item.imageUrl && <img src={item.imageUrl} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                      <div>
                        <p style={{ fontSize: 15, color: 'var(--fs-ivory)', marginBottom: 4 }}>{item.productName}</p>
                        <p style={{ fontSize: 13, color: 'var(--fs-ash)' }}>{item.variantLabel} · Qty {item.quantity}</p>
                      </div>
                    </motion.div>
                  ))
                )}
                <motion.button onClick={goNext} disabled={selectedItems.length === 0} whileTap={{ scale: 0.97 }}
                  style={{ marginTop: 16, width: '100%', height: 52, background: selectedItems.length > 0 ? 'var(--fs-linen)' : 'var(--fs-wire)', color: selectedItems.length > 0 ? 'var(--fs-void)' : 'var(--fs-ash)', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed' }}>
                  Continue →
                </motion.button>
              </div>
            )}

            {/* Step 2 — Reasons */}
            {step === 1 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 20, color: 'var(--fs-ivory)', marginBottom: 20 }}>Why are you returning?</h2>
                {selectedItems.map(itemId => {
                  const item = order?.items.find(i => i.id === itemId);
                  return item ? (
                    <div key={itemId} style={{ marginBottom: 24 }}>
                      <p style={{ fontSize: 14, color: 'var(--fs-ivory)', marginBottom: 12 }}>{item.productName}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {RETURN_REASONS.map(reason => (
                          <motion.button key={reason} onClick={() => setReasons(r => ({ ...r, [itemId]: reason }))} whileTap={{ scale: 0.98 }}
                            animate={{ borderColor: reasons[itemId] === reason ? '#C9A96E' : '#252525', background: reasons[itemId] === reason ? 'var(--fs-surface-2)' : 'transparent' }}
                            style={{ padding: '12px 16px', borderRadius: 2, border: '1px solid', textAlign: 'left', fontSize: 14, color: reasons[itemId] === reason ? 'var(--fs-ivory)' : 'var(--fs-ash)', cursor: 'pointer', transition: 'color 0.2s' }}>
                            {reason}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={goBack} style={{ flex: 1, height: 48, background: 'none', border: '1px solid var(--fs-wire)', color: 'var(--fs-ash)', borderRadius: 2, cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>← Back</button>
                  <motion.button onClick={goNext} disabled={selectedItems.some(id => !reasons[id])} whileTap={{ scale: 0.97 }}
                    style={{ flex: 2, height: 48, background: selectedItems.every(id => reasons[id]) ? 'var(--fs-linen)' : 'var(--fs-wire)', color: 'var(--fs-void)', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    Continue →
                  </motion.button>
                </div>
              </div>
            )}

            {/* Step 3 — Return Type */}
            {step === 2 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 20, color: 'var(--fs-ivory)', marginBottom: 20 }}>How would you like to receive?</h2>
                {[{ id: 'refund', label: 'Refund to original payment', desc: 'Back to your card/UPI in 5-7 business days' }, { id: 'store_credit', label: 'Store credit', desc: 'Instant credit to use on your next order' }].map(opt => (
                  <motion.button key={opt.id} onClick={() => setReturnType(opt.id as any)} whileTap={{ scale: 0.98 }}
                    animate={{ borderColor: returnType === opt.id ? '#C9A96E' : '#252525', background: returnType === opt.id ? 'var(--fs-surface-2)' : 'var(--fs-surface)' }}
                    style={{ display: 'block', width: '100%', padding: '20px', marginBottom: 12, borderRadius: 2, border: '1px solid', textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ fontSize: 15, color: 'var(--fs-ivory)', marginBottom: 4 }}>{opt.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--fs-ash)' }}>{opt.desc}</div>
                  </motion.button>
                ))}
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button onClick={goBack} style={{ flex: 1, height: 48, background: 'none', border: '1px solid var(--fs-wire)', color: 'var(--fs-ash)', borderRadius: 2, cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>← Back</button>
                  <motion.button onClick={goNext} disabled={!returnType} whileTap={{ scale: 0.97 }}
                    style={{ flex: 2, height: 48, background: returnType ? 'var(--fs-linen)' : 'var(--fs-wire)', color: 'var(--fs-void)', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: returnType ? 'pointer' : 'not-allowed' }}>
                    Continue →
                  </motion.button>
                </div>
              </div>
            )}

            {/* Step 4 — Review & Submit */}
            {step === 3 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 20, color: 'var(--fs-ivory)', marginBottom: 20 }}>Review & Submit</h2>
                <div style={{ padding: 20, background: 'var(--fs-surface-2)', borderRadius: 2, marginBottom: 20 }}>
                  {selectedItems.map(id => {
                    const item = order?.items.find(i => i.id === id);
                    return item ? (
                      <div key={id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14 }}>
                        <span style={{ color: 'var(--fs-ivory)' }}>{item.productName}</span>
                        <span style={{ color: 'var(--fs-ash)' }}>{reasons[id]}</span>
                      </div>
                    ) : null;
                  })}
                  <div style={{ height: 1, background: 'var(--fs-wire)', margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: 'var(--fs-ash)' }}>Resolution</span>
                    <span style={{ color: 'var(--fs-ivory)' }}>{returnType === 'refund' ? 'Refund to original payment' : 'Store credit'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={goBack} style={{ flex: 1, height: 48, background: 'none', border: '1px solid var(--fs-wire)', color: 'var(--fs-ash)', borderRadius: 2, cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>← Back</button>
                  <motion.button onClick={handleSubmit} disabled={submitting} whileTap={{ scale: 0.97 }}
                    animate={submitting ? { opacity: [1, 0.7, 1] } : {}}
                    transition={submitting ? { duration: 0.8, repeat: Infinity } : {}}
                    style={{ flex: 2, height: 48, background: 'var(--fs-linen)', color: 'var(--fs-void)', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {submitting ? <SpiderLoader size="sm" /> : 'Submit Return'}
                  </motion.button>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
