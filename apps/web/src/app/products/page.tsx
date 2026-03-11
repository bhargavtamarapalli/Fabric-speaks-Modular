'use client';
import { useState } from 'react';
import { NavBar } from '@/components/organisms/NavBar';
import { ProductCard, Product } from '@/components/molecules/ProductCard';
import { Filter, ChevronDown } from 'lucide-react';

const DUMMY_PRODUCTS: Product[] = [
  { id: '1', slug: 'heavy-linen-canvas', name: 'Heavy Linen Canvas', brand: { name: 'Fabric Speaks' }, price: 4500, sale_active: false, thumbnail_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600' },
  { id: '2', slug: 'raw-silk-noil', name: 'Raw Silk Noil', brand: { name: 'Heritage' }, price: 6200, sale_price: 5500, sale_active: true, thumbnail_url: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=600' },
  { id: '3', slug: 'kora-cotton-muslin', name: 'Kora Cotton Muslin', brand: { name: 'Earth' }, price: 1200, sale_active: false, thumbnail_url: 'https://images.unsplash.com/photo-1620799139834-6b8f844fbe61?auto=format&fit=crop&q=80&w=600' },
  { id: '4', slug: 'hemp-twill', name: 'Hemp Twill', brand: { name: 'Fabric Speaks' }, price: 3400, sale_active: false, thumbnail_url: 'https://images.unsplash.com/photo-1528321917418-4dcb8ed99955?auto=format&fit=crop&q=80&w=600' },
  { id: '5', slug: 'organic-cotton-poplin', name: 'Organic Cotton Poplin', brand: { name: 'Earth' }, price: 1800, sale_active: false, thumbnail_url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=600' },
  { id: '6', slug: 'bamboo-viscose', name: 'Bamboo Viscose', brand: { name: 'Future' }, price: 2900, sale_active: false, thumbnail_url: 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&q=80&w=600' },
];

export default function ProductsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--fs-surface)] flex flex-col">
      <NavBar />
      
      {/* Page Header */}
      <div className="pt-24 pb-8 px-4 md:px-8 border-b border-[var(--fs-wire)]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-[12px] font-mono text-[var(--fs-ash)] mb-4 breadcrumbs">
            <span>HOME</span> / <span className="text-[var(--fs-linen)]">SHOP</span>
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
          <span className="font-mono text-[12px] text-[var(--fs-ash)]">{DUMMY_PRODUCTS.length} Results</span>
        </div>

        {/* Sidebar Filter */}
        <aside className={`
          fixed md:sticky top-0 md:top-16 left-0 h-full md:h-[calc(100vh-64px)] 
          w-80 md:w-64 bg-[var(--fs-surface)] border-r border-[var(--fs-wire)] z-40 md:z-10
          transform transition-transform duration-300 ease-in-out overflow-y-auto
          ${isFilterOpen ? 'translate-x-[0]' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-6 md:p-4 md:pt-8 flex flex-col gap-8">
            {/* Header for mobile */}
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
                <li className="flex items-center gap-2"><input type="checkbox" className="accent-[var(--fs-linen)] bg-transparent border border-[var(--fs-wire)] w-4 h-4 cursor-pointer" /> Linen</li>
                <li className="flex items-center gap-2"><input type="checkbox" className="accent-[var(--fs-linen)] bg-transparent border border-[var(--fs-wire)] w-4 h-4 cursor-pointer" /> Silk</li>
                <li className="flex items-center gap-2"><input type="checkbox" className="accent-[var(--fs-linen)] bg-transparent border border-[var(--fs-wire)] w-4 h-4 cursor-pointer" /> Cotton</li>
                <li className="flex items-center gap-2"><input type="checkbox" className="accent-[var(--fs-linen)] bg-transparent border border-[var(--fs-wire)] w-4 h-4 cursor-pointer" /> Wool</li>
              </ul>
            </div>

            {/* Filter Group: Price */}
            <div className="border-t border-[var(--fs-wire)] pt-6">
              <h3 className="flex justify-between items-center font-sans text-[14px] uppercase tracking-widest text-[var(--fs-ivory)] mb-4">
                Price <ChevronDown size={14} className="text-[var(--fs-ash)]"/>
              </h3>
              <div className="flex items-center gap-2 font-mono text-[12px]">
                <input type="number" placeholder="Min" className="w-full bg-[var(--fs-surface-2)] border border-[var(--fs-wire)] text-[var(--fs-ivory)] px-2 py-1 outline-none" />
                <span className="text-[var(--fs-ash)]">-</span>
                <input type="number" placeholder="Max" className="w-full bg-[var(--fs-surface-2)] border border-[var(--fs-wire)] text-[var(--fs-ivory)] px-2 py-1 outline-none" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8">
              <button className="w-full bg-[var(--fs-linen)] text-[var(--fs-void)] uppercase tracking-widest text-[12px] font-medium py-3 hover:opacity-90 transition-opacity">
                Apply Filters
              </button>
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

        {/* Product Grid */}
        <main className="flex-1 p-4 md:p-8">
          <div className="hidden md:flex justify-between items-center mb-8">
            <span className="font-mono text-[13px] text-[var(--fs-ash)]">{DUMMY_PRODUCTS.length} Results</span>
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
            {DUMMY_PRODUCTS.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
