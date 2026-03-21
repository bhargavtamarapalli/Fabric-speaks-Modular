'use client';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { NavBar } from '@/components/organisms/NavBar';
import { MagneticButton } from '@/components/atoms/MagneticButton';
import { Minus, Plus, Trash2, MapPin, Tag, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getCart, updateCartItemQuantity, removeFromCart, applyCoupon as apiApplyCoupon, removeCoupon as apiRemoveCoupon, Cart } from '@/lib/api/cart';
import { checkPincode, PincodeCheckResult } from '@/lib/api/pincode';

export default function CartPage() {
  const { showToast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState<PincodeCheckResult | null>(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCart();
      setCart(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      const res = await updateCartItemQuantity(itemId, newQuantity);
      setCart(res);
    } catch (err: any) {
      showToast(err.message || "Failed to update quantity", "error");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const res = await removeFromCart(itemId);
      setCart(res);
      showToast("Item removed from cart", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to remove item", "error");
    }
  };

  const handleCheckPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.length !== 6) {
      showToast("Please enter a valid 6-digit pincode", "error");
      return;
    }
    try {
      setPincodeLoading(true);
      const res = await checkPincode(pincode);
      setPincodeResult(res);
    } catch (err: any) {
      showToast(err.message || "Failed to check pincode", "error");
    } finally {
      setPincodeLoading(false);
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    try {
      setCouponLoading(true);
      const res = await apiApplyCoupon(couponCode);
      setCart(res);
      showToast("Coupon applied successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Invalid coupon code", "error");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      setCouponLoading(true);
      const res = await apiRemoveCoupon();
      setCart(res);
      setCouponCode('');
      showToast("Coupon removed", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to remove coupon", "error");
    } finally {
      setCouponLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--fs-surface)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--fs-linen)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--fs-surface)] flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-serif text-[var(--fs-ivory)] mb-4">Something went wrong</h2>
        <p className="text-[var(--fs-ash)] mb-8 max-w-md">{error}</p>
        <MagneticButton onClick={fetchCart}>Retry</MagneticButton>
      </div>
    );
  }

  const items = cart?.items || [];

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
                    <Link href={`/products/${item.productSlug}`} className="w-24 h-32 md:w-32 md:h-40 flex-shrink-0 bg-black relative">
                      <img src={item.thumbnailUrl} alt={item.productName} className="absolute inset-0 w-full h-full object-cover" />
                    </Link>

                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-sans text-[11px] uppercase tracking-widest text-[var(--fs-ash)] mb-1">
                            {item.brandName}
                          </p>
                          <Link href={`/products/${item.productSlug}`} className="font-sans text-[14px] md:text-[16px] text-[var(--fs-ivory)] hover:text-[var(--fs-linen)] transition-colors line-clamp-2">
                            {item.productName}
                          </Link>
                          <p className="font-mono text-[12px] text-[var(--fs-ash)] mt-2">
                            Size: {item.size} | Color: {item.colour}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-[var(--fs-ash)] hover:text-[var(--fs-error)] transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center border border-[var(--fs-wire)] rounded-full">
                          <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} className="px-3 py-1.5 text-[var(--fs-ash)] hover:text-[var(--fs-linen)]"><Minus size={14} /></button>
                          <span className="font-mono text-[13px] text-[var(--fs-ivory)] w-6 text-center">{item.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} className="px-3 py-1.5 text-[var(--fs-ash)] hover:text-[var(--fs-linen)]"><Plus size={14} /></button>
                        </div>
                        <div className="font-mono text-[14px] text-[var(--fs-linen)]">
                          ₹{((item.isSaleActive && item.salePrice ? item.salePrice : item.price) * item.quantity).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Right Col: Summary */}
            <div className="lg:w-2/5 flex flex-col gap-8">
              
              {/* Pincode */}
              <div className="bg-[var(--fs-surface-2)] p-6 border border-[var(--fs-wire)]">
                <h3 className="font-sans text-[13px] uppercase tracking-widest text-[var(--fs-ivory)] mb-4 flex items-center gap-2">
                  <MapPin size={16} /> Delivery Options
                </h3>
                <form onSubmit={handleCheckPincode} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter Pincode" 
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="flex-1 bg-transparent border-b border-[var(--fs-wire)] font-mono text-[14px] text-[var(--fs-ivory)] focus:border-[var(--fs-linen)] outline-none py-2 px-1 transition-colors"
                  />
                  <button type="submit" disabled={pincodeLoading} className="font-sans text-[12px] uppercase tracking-wide text-[var(--fs-ash)] hover:text-[var(--fs-linen)] transition-colors">
                    {pincodeLoading ? '...' : 'Check'}
                  </button>
                </form>
                {pincodeResult && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-black/20 border border-[var(--fs-wire)]">
                    <p className={`font-sans text-[13px] flex items-center gap-2 ${pincodeResult.isServiceable ? 'text-[var(--fs-success)]' : 'text-[var(--fs-error)]'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${pincodeResult.isServiceable ? 'bg-[var(--fs-success)]' : 'bg-[var(--fs-error)]'}`}/> 
                      {pincodeResult.isServiceable ? 'Delivery Available' : 'Not Serviceable'}
                    </p>
                    {pincodeResult.isServiceable && (
                      <>
                        <p className="font-sans text-[12px] text-[var(--fs-ash)] mt-1">Est. Arrival: {pincodeResult.estimatedDays} Days</p>
                        <p className="font-sans text-[12px] text-[var(--fs-ash)] mt-1">COD: <span className={pincodeResult.codAvailable ? 'text-[var(--fs-ivory)]' : 'text-[var(--fs-error)]'}>{pincodeResult.codAvailable ? 'Eligible' : 'Not Eligible'}</span></p>
                      </>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Coupon */}
              <div className="bg-[var(--fs-surface-2)] p-6 border border-[var(--fs-wire)]">
                <h3 className="font-sans text-[13px] uppercase tracking-widest text-[var(--fs-ivory)] mb-4 flex items-center gap-2">
                  <Tag size={16} /> Apply Coupon
                </h3>
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Coupon Code" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 bg-transparent border-b border-[var(--fs-wire)] font-mono text-[14px] text-[var(--fs-ivory)] focus:border-[var(--fs-linen)] outline-none py-2 px-1 uppercase transition-colors"
                  />
                  <button type="submit" disabled={couponLoading} className="font-sans text-[12px] uppercase tracking-wide text-[var(--fs-ash)] hover:text-[var(--fs-linen)] transition-colors">
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </form>
                {cart && cart.discount > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between items-center mt-2">
                    <p className="font-mono text-[12px] text-[var(--fs-success)]">
                      Discount applied!
                    </p>
                    <button onClick={handleRemoveCoupon} className="text-[10px] text-[var(--fs-ash)] underline uppercase">Remove</button>
                  </motion.div>
                )}
              </div>

              <div className="bg-[var(--fs-surface-2)] p-6 border border-[var(--fs-wire)]">
                <h3 className="font-sans text-[13px] uppercase tracking-widest text-[var(--fs-ivory)] mb-6">
                  Order Summary
                </h3>
                <div className="flex flex-col gap-4 font-mono text-[14px] text-[var(--fs-ash)] mb-6">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{cart?.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {cart && cart.discount > 0 && (
                    <div className="flex justify-between text-[var(--fs-success)]">
                      <span>Discount</span>
                      <span>- ₹{cart.discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Estimated Shipping</span>
                    <span>{cart?.shipping === 0 ? 'FREE' : '₹' + cart?.shipping}</span>
                  </div>
                </div>
                <div className="flex justify-between font-mono text-[18px] text-[var(--fs-linen)] border-t border-[var(--fs-wire)] pt-4 mb-8">
                  <span>Total</span>
                  <span>₹{cart?.total.toLocaleString('en-IN')}</span>
                </div>

                <div className="hidden lg:block w-full">
                  <Link href="/checkout">
                    <MagneticButton className="w-full">
                      Proceed to Checkout
                    </MagneticButton>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile CTA */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 w-full bg-[var(--fs-surface)]/90 backdrop-blur-md border-t border-[var(--fs-wire)] p-4 z-40 flex justify-between items-center gap-4">
          <div className="flex flex-col">
            <span className="font-mono text-[11px] text-[var(--fs-ash)]">Total</span>
            <span className="font-mono text-[16px] text-[var(--fs-linen)]">₹{cart?.total.toLocaleString('en-IN')}</span>
          </div>
          <Link href="/checkout" className="flex-1">
            <MagneticButton className="w-full py-4 text-[13px]">
              Checkout
            </MagneticButton>
          </Link>
        </div>
      )}
    </div>
  );
}
