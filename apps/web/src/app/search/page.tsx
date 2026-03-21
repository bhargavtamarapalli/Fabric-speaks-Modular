'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { NavBar } from '@/components/organisms/NavBar';
import { ProductCard } from '@/components/molecules/ProductCard';
import { Search, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getProducts, getSearchSuggestions, Product } from '@/lib/api/products';
import { MagneticButton } from '@/components/atoms/MagneticButton';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await getSearchSuggestions(q);
      setSuggestions(res);
    } catch {
      // Ignore suggestion errors silenty
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) fetchSuggestions(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  const handleSearch = async (e?: React.FormEvent, searchQuery?: string) => {
    if (e) e.preventDefault();
    const q = searchQuery || query;
    if (!q.trim()) return;

    try {
      setIsSearching(true);
      setError(null);
      const res = await getProducts({ search: q, limit: 20 });
      setResults(res.items);
      setQuery(q);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--fs-surface)] flex flex-col">
      <NavBar />
      
      <main className="flex-1 pt-24 px-4 md:px-8 max-w-[1280px] w-full mx-auto flex flex-col items-center">
        
        {/* Search Bar */}
        <div className="w-full max-w-3xl mb-12">
          <form onSubmit={(e) => handleSearch(e)} className="relative w-full">
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
                onClick={() => { setQuery(''); setResults([]); setSuggestions([]); }}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--fs-ash)] hover:text-[var(--fs-linen)] transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </form>

          {/* Suggestions */}
          {suggestions.length > 0 && !isSearching && results.length === 0 && (
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <span className="font-mono text-[12px] text-[var(--fs-ash)] uppercase tracking-wider py-2 mr-2">Suggestions:</span>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSearch(undefined, suggestion)}
                  className="px-4 py-1.5 rounded-full border border-[var(--fs-wire)] font-sans text-[13px] text-[var(--fs-ivory)] hover:border-[var(--fs-linen)] hover:text-[var(--fs-linen)] transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="w-full border-t border-[var(--fs-wire)] pt-12">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--fs-linen)] mb-4" />
              <span className="font-mono text-[12px] text-[var(--fs-ash)] uppercase tracking-widest">Searching...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
               <p className="text-[var(--fs-error)] mb-4">{error}</p>
               <MagneticButton onClick={() => handleSearch()}>Retry</MagneticButton>
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="mb-8 font-mono text-[13px] text-[var(--fs-ash)]">
                {results.length} Results for "<span className="text-[var(--fs-ivory)]">{query}</span>"
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {results.map(p => (
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
          ) : (
             <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Search size={48} className="mb-4 text-[var(--fs-ash)]" />
                <p className="font-serif text-xl text-[var(--fs-ivory)]">Start typing to explore</p>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
