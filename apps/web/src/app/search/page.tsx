'use client';
import { useState, useRef, useEffect } from 'react';
import { NavBar } from '@/components/organisms/NavBar';
import { ProductCard, Product } from '@/components/molecules/ProductCard';
import { Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

const SUGGESTIONS = [
  'Raw Silk',
  'Heavy Linen',
  'Organic Cotton',
  'Basket Weave',
  'Flanders Origin'
];

const DUMMY_RESULTS: Product[] = [
  { id: '1', slug: 'heavy-linen-canvas', name: 'Heavy Linen Canvas', brand: { name: 'Fabric Speaks' }, price: 4500, sale_active: false, thumbnail_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600' },
  { id: '2', slug: 'raw-silk-noil', name: 'Raw Silk Noil', brand: { name: 'Heritage' }, price: 6200, sale_price: 5500, sale_active: true, thumbnail_url: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=600' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Autofocus requirement
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsSearching(true);
      // Simulate API call
      setTimeout(() => {
        setIsSearching(false);
      }, 600);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--fs-surface)] flex flex-col">
      <NavBar />
      
      <main className="flex-1 pt-24 px-4 md:px-8 max-w-[1280px] w-full mx-auto flex flex-col items-center">
        
        {/* Search Bar */}
        <div className="w-full max-w-3xl mb-12">
          <form onSubmit={handleSearch} className="relative w-full">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fabrics, brands, or collections..."
              className="w-full bg-[var(--fs-surface-2)] border border-[var(--fs-wire)] rounded-full py-4 pl-12 pr-12 text-[16px] text-[var(--fs-ivory)] outline-none focus:border-[var(--fs-linen)] placeholder:text-[var(--fs-ash)]/70 transition-colors font-sans"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--fs-ash)]" size={20} />
            {query && (
              <button 
                type="button" 
                onClick={() => setQuery('')}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--fs-ash)] hover:text-[var(--fs-linen)] transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </form>

          {/* Suggestion Chips */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <span className="font-mono text-[12px] text-[var(--fs-ash)] uppercase tracking-wider py-2 mr-2">Suggestions:</span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  setIsSearching(true);
                  setTimeout(() => setIsSearching(false), 600);
                }}
                className="px-4 py-1.5 rounded-full border border-[var(--fs-wire)] font-sans text-[13px] text-[var(--fs-ivory)] hover:border-[var(--fs-linen)] hover:text-[var(--fs-linen)] transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div className="w-full border-t border-[var(--fs-wire)] pt-12">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              {/* Could use SpiderLoader here */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-8 h-8 border-2 border-[var(--fs-linen)] border-t-transparent rounded-full mb-4"
              />
              <span className="font-mono text-[12px] text-[var(--fs-ash)] uppercase tracking-widest">Searching...</span>
            </div>
          ) : query && DUMMY_RESULTS.length > 0 ? (
            <div>
              <div className="mb-8 font-mono text-[13px] text-[var(--fs-ash)]">
                {DUMMY_RESULTS.length} Results for "<span className="text-[var(--fs-ivory)]">{query}</span>"
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {DUMMY_RESULTS.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          ) : query ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <h2 className="font-serif text-3xl text-[var(--fs-ivory)] mb-4">No results found</h2>
              <p className="font-sans text-[var(--fs-ash)] max-w-md">
                We couldn't find anything matching "{query}". Try adjusting your search or explore our popular collections.
              </p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
