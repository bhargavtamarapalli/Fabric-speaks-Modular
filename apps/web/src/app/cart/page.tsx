'use client';
import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { NavBar } from '@/components/organisms/NavBar';
import { MagneticButton } from '@/components/atoms/MagneticButton';
import { ChevronRight, Minus, Plus, Trash2, MapPin, Tag } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Cart Item Data
const DUMMY_CART_ITEMS = [
  {
    id: 'cart_1',
    product: {
      slug: 'heavy-linen-canvas',
      name: 'Structured Heavy Linen Canvas Jacket',
      brand: 'Fabric Speaks',
      price: 4500,
      sale_price: 3900,
      thumbnail: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=300'
    },
    variant: {
      size: 'L',
      color: 'Unbleached Flax'
    },
    quantity: 1
  },
  {
    id: 'cart_2',
    product: {
      slug: 'raw-silk-noil',
      name: 'Raw Silk Noil Evening Coat',
      brand: 'Heritage',
      price: 6200,
      thumbnail: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=300'
    },
    variant: {
      size: 'M',
      color: 'Void Black'
    },
    quantity: 2
  }
];

export default function CartPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState(DUMMY_CART_ITEMS);
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState<{deliverable?: boolean, est?: string, cod?: boolean} | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.product.sale_price || item.product.price) * item.quantity, 0);
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newQ = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const checkPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if(pincode.length === 6) {
      // Mock API call
      setTimeout(() => {
        setPincodeResult({ deliverable: true, est: '3-5 Days', cod: true });
      }, 500);
    }
  };

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if(couponCode.toUpperCase() === 'WELCOME10') {
      const sub = calculateSubtotal();
      setDiscount(sub * 0.1);
      showToast("Coupon applied successfully!", "success");
    } else {
      showToast("Invalid coupon code", "error");
      setDiscount(0);
    }
  };

  const subtotal = calculateSubtotal();
  const shipping = subtotal > 5000 ? 0 : 250;
  const total = subtotal - discount + shipping;

  return (
    <div className="min-h-screen bg-[var(--fs-surface)] flex flex-col pt-24 pb-32 lg:pb-12">
      <NavBar />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 md:px-8">
        <h1 className="font-serif text-3xl md:text-5xl text-[var(--fs-ivory)] mb-8">Your Cart</h1>
        
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border-t border-[var(--fs-wire)]">
            <h2 className="font-sans text-xl text-[var(--fs-ash)] mb-6">Your cart is empty.</h2>
            <Link href="/products">
              <MagneticButton>Continue Shopping</MagneticButton>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Left Col: Cart Items */}
            <div className="lg:w-3/5 flex flex-col gap-6">
              <AnimatePresence>
                {items.map(item => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    className="flex gap-4 p-4 bg-[var(--fs-surface-2)] border border-[var(--fs-wire)]"
                  >
                    {/* Item Image */}
                    <Link href={`/products/${item.product.slug}`} className="w-24 h-32 md:w-32 md:h-40 flex-shrink-0 bg-black relative">
                      <img src={item.product.thumbnail} alt={item.product.name} className="absolute inset-0 w-full h-full object-cover" />
                    </Link>

                    {/* Item Details */}
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-sans text-[11px] uppercase tracking-widest text-[var(--fs-ash)] mb-1">
                            {item.product.brand}
                          </p>
                          <Link href={`/products/${item.product.slug}`} className="font-sans text-[14px] md:text-[16px] text-[var(--fs-ivory)] hover:text-[var(--fs-linen)] transition-colors line-clamp-2">
                            {item.product.name}
                          </Link>
                          <p className="font-mono text-[12px] text-[var(--fs-ash)] mt-2">
                            Size: {item.variant.size} | Color: {item.variant.color}
                          </p>
                        </div>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-[var(--fs-ash)] hover:text-[var(--fs-error)] transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center border border-[var(--fs-wire)] rounded-full">
                          <button onClick={() => updateQuantity(item.id, -1)} className="px-3 py-1.5 text-[var(--fs-ash)] hover:text-[var(--fs-linen)]"><Minus size={14} /></button>
                          <span className="font-mono text-[13px] text-[var(--fs-ivory)] w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="px-3 py-1.5 text-[var(--fs-ash)] hover:text-[var(--fs-linen)]"><Plus size={14} /></button>
                        </div>
                        <div className="font-mono text-[14px] text-[var(--fs-linen)]">
                          ₹{((item.product.sale_price || item.product.price) * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Right Col: Summary & Tools */}
            <div className="lg:w-2/5 flex flex-col gap-8">
              
              {/* Pincode Checker */}
              <div className="bg-[var(--fs-surface-2)] p-6 border border-[var(--fs-wire)]">
                <h3 className="font-sans text-[13px] uppercase tracking-widest text-[var(--fs-ivory)] mb-4 flex items-center gap-2">
                  <MapPin size={16} /> Delivery Options
                </h3>
                <form onSubmit={checkPincode} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter Pincode" 
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="flex-1 bg-transparent border-b border-[var(--fs-wire)] font-mono text-[14px] text-[var(--fs-ivory)] focus:border-[var(--fs-linen)] outline-none py-2 px-1 transition-colors"
                  />
                  <button type="submit" className="font-sans text-[12px] uppercase tracking-wide text-[var(--fs-ash)] hover:text-[var(--fs-linen)] transition-colors">
                    Check
                  </button>
                </form>
                {pincodeResult && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-black/20 border border-[var(--fs-wire)]">
                    <p className="font-sans text-[13px] text-[var(--fs-success)] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--fs-success)] inline-block"/> Delivery Available
                    </p>
                    <p className="font-sans text-[12px] text-[var(--fs-ash)] mt-1">Est. Arrival: {pincodeResult.est}</p>
                    <p className="font-sans text-[12px] text-[var(--fs-ash)] mt-1">COD: <span className={pincodeResult.cod ? 'text-[var(--fs-ivory)]' : 'text-[var(--fs-error)]'}>{pincodeResult.cod ? 'Eligible' : 'Not Eligible'}</span></p>
                  </motion.div>
                )}
              </div>

              {/* Coupon */}
              <div className="bg-[var(--fs-surface-2)] p-6 border border-[var(--fs-wire)]">
                <h3 className="font-sans text-[13px] uppercase tracking-widest text-[var(--fs-ivory)] mb-4 flex items-center gap-2">
                  <Tag size={16} /> Apply Coupon
                </h3>
                <form onSubmit={applyCoupon} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Coupon Code" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 bg-transparent border-b border-[var(--fs-wire)] font-mono text-[14px] text-[var(--fs-ivory)] focus:border-[var(--fs-linen)] outline-none py-2 px-1 uppercase transition-colors"
                  />
                  <button type="submit" className="font-sans text-[12px] uppercase tracking-wide text-[var(--fs-ash)] hover:text-[var(--fs-linen)] transition-colors">
                    Apply
                  </button>
                </form>
                {discount > 0 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-[12px] text-[var(--fs-success)] mt-2">
                    - ₹{discount.toLocaleString()} applied!
                  </motion.p>
                )}
              </div>

              {/* Order Summary */}
              <div className="bg-[var(--fs-surface-2)] p-6 border border-[var(--fs-wire)]">
                <h3 className="font-sans text-[13px] uppercase tracking-widest text-[var(--fs-ivory)] mb-6">
                  Order Summary
                </h3>
                <div className="flex flex-col gap-4 font-mono text-[14px] text-[var(--fs-ash)] mb-6">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[var(--fs-success)]">
                      <span>Discount</span>
                      <span>- ₹{discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Estimated Shipping</span>
                    <span>{shipping === 0 ? 'FREE' : '₹' + shipping}</span>
                  </div>
                </div>
                <div className="flex justify-between font-mono text-[18px] text-[var(--fs-linen)] border-t border-[var(--fs-wire)] pt-4 mb-8">
                  <span>Total</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>

                <div className="hidden lg:block w-full">
                  <MagneticButton className="w-full">
                    Proceed to Checkout
                  </MagneticButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Mobile Checkout CTA */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 w-full bg-[var(--fs-surface)]/90 backdrop-blur-md border-t border-[var(--fs-wire)] p-4 z-40 flex justify-between items-center gap-4">
          <div className="flex flex-col">
            <span className="font-mono text-[11px] text-[var(--fs-ash)]">Total</span>
            <span className="font-mono text-[16px] text-[var(--fs-linen)]">₹{total.toLocaleString()}</span>
          </div>
          <MagneticButton className="flex-1 py-4 text-[13px]">
            Checkout
          </MagneticButton>
        </div>
      )}
    </div>
  );
}
