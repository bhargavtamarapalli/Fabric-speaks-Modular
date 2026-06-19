'use client';
import { useState, useEffect, useCallback } from 'react';
import { NavBar } from '@/components/organisms/NavBar';
import { ProductCard } from '@/components/molecules/ProductCard';
import { Filter, ChevronDown, Loader2 } from 'lucide-react';
import { getProducts, Product } from '@/lib/api/products';
import { MagneticButton } from '@/components/atoms/MagneticButton';
import { EmptyState } from '@/components/atoms/EmptyState';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getProducts({
        fabric: selectedFabrics.length > 0 ? selectedFabrics.join(',') : undefined,
        limit: 12
      });
      setProducts(res?.items ?? []);
      setTotal(res?.total ?? 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [selectedFabrics]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleFabricToggle = (fabric: string) => {
    setSelectedFabrics(prev => 
      prev.includes(fabric) ? prev.filter(f => f !== fabric) : [...prev, fabric]
    );
  };

  return (
    <div className="min-h-screen bg-[var(--fs-surface)] flex flex-col">
      <NavBar />
      
      {/* Page Header */}
      <div className="pt-24 pb-8 px-4 md:px-8 border-b border-[var(--fs-wire)]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-[12px] font-mono text-[var(--fs-ash)] mb-4 breadcrumbs">
            <Link href="/" className="hover:text-[var(--fs-linen)]">HOME</Link> / <span className="text-[var(--fs-linen)]">SHOP</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-[var(--fs-ivory)]">All Fabrics</h1>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-[1280px] w-full mx-auto flex flex-col md:flex-row relative">
        
        {/* Mobile Filter Toggle */}
        <div className="md:hidden sticky top-16 z-30 bg-[var(--fs-surface)] border-b border-[var(--fs-wire)] p-4 flex justify-between items-center">
          <button 
            className="flex items-center gap-2 font-sans text-[13px] uppercase tracking-wider text-[var(--fs-ivory)]"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter size={16} /> Filters
          </button>
          <span className="font-mono text-[12px] text-[var(--fs-ash)]">{total} Results</span>
        </div>

        {/* Sidebar Filter */}
        <aside className={`
          fixed md:sticky top-0 md:top-16 left-0 h-full md:h-[calc(100vh-64px)] 
          w-80 md:w-64 bg-[var(--fs-surface)] border-r border-[var(--fs-wire)] z-40 md:z-10
          transform transition-transform duration-300 ease-in-out overflow-y-auto
          ${isFilterOpen ? 'translate-x-[0]' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-6 md:p-4 md:pt-8 flex flex-col gap-8">
            <div className="md:hidden flex justify-between items-center mb-4">
              <span className="font-serif text-xl text-[var(--fs-ivory)]">Filters</span>
              <button className="text-[var(--fs-ash)]" onClick={() => setIsFilterOpen(false)}>Close</button>
            </div>

            {/* Filter Group: Category */}
            <div>
              <h3 className="flex justify-between items-center font-sans text-[14px] uppercase tracking-widest text-[var(--fs-ivory)] mb-4">
                Fabric <ChevronDown size={14} className="text-[var(--fs-ash)]"/>
              </h3>
              <ul className="space-y-3 font-mono text-[13px] text-[var(--fs-ash)]">
                {['Linen', 'Silk', 'Cotton', 'Wool', 'Hemp'].map(fabric => (
                  <li key={fabric} className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id={`fabric-${fabric}`}
                      checked={selectedFabrics.includes(fabric)}
                      onChange={() => handleFabricToggle(fabric)}
                      className="accent-[var(--fs-linen)] bg-transparent border border-[var(--fs-wire)] w-4 h-4 cursor-pointer" 
                    /> 
                    <label htmlFor={`fabric-${fabric}`} className="cursor-pointer hover:text-[var(--fs-linen)] transition-colors">{fabric}</label>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mt-8">
               <MagneticButton 
                  onClick={() => { fetchProducts(); setIsFilterOpen(false); }}
                  className="w-full"
               >
                  Apply Filters
               </MagneticButton>
            </div>
          </div>
        </aside>

        {/* Mobile Filter Backdrop */}
        {isFilterOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsFilterOpen(false)}
          />
        )}

        {/* Product Listing Area */}
        <main className="flex-1 p-4 md:p-8">
          {loading ? (
             <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--fs-linen)]" />
             </div>
          ) : error ? (
             <div className="h-64 flex flex-col items-center justify-center text-center">
                <p className="text-[var(--fs-error)] mb-4">{error}</p>
                <MagneticButton onClick={fetchProducts}>Retry</MagneticButton>
             </div>
          ) : (products?.length ?? 0) === 0 ? (
             <EmptyState
               variant={selectedFabrics.length > 0 ? 'no-results' : 'restocking'}
               onAction={selectedFabrics.length > 0 ? () => setSelectedFabrics([]) : undefined}
               actionLabel={selectedFabrics.length > 0 ? 'Clear all filters' : undefined}
             />
          ) : (
             <>
                <div className="hidden md:flex justify-between items-center mb-8">
                  <span className="font-mono text-[13px] text-[var(--fs-ash)]">{total} Results</span>
                  <div className="flex items-center gap-2 font-sans text-[13px] text-[var(--fs-ash)]">
                    Sort by: 
                    <select className="bg-transparent text-[var(--fs-ivory)] border-none outline-none cursor-pointer tracking-wider">
                      <option value="newest" className="bg-[var(--fs-surface)]">Newest</option>
                      <option value="price_asc" className="bg-[var(--fs-surface)]">Price: Low to High</option>
                      <option value="price_desc" className="bg-[var(--fs-surface)]">Price: High to Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
             </>
          )}
        </main>
      </div>
    </div>
  );
}

import Link from 'next/link';
