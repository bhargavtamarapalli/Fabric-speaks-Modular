'use client';

import { useState } from 'react';
import { InventoryAllowed } from '@/components/admin/WithRoleGuard';
import { apiFetch } from '@/lib/apiClient';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function AdminProductForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    basePrice: '',
    fabricType: '',
    gsmWeight: '',
    weaveType: '',
    careInstructions: '',
    fabricOrigin: 'India',
    isActive: true
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        basePrice: Number(formData.basePrice)
      };
      await apiFetch('POST', '/api/v1/catalog/admin/products', payload, { withCredentials: true });
      router.push('/admin/products');
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <InventoryAllowed>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <Link href="/admin/products" className="p-2 border border-gray-800 rounded hover:bg-gray-800 transition text-gray-400 hover:text-[var(--fs-linen)]">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-serif text-[var(--fs-linen)]">Create Product</h1>
            <p className="text-gray-400 text-sm mt-1">Add a new fabric product to the catalog.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-medium border-b border-gray-800 pb-2 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Product Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-[var(--fs-void)] border border-gray-700 rounded-md py-2 px-3 text-[var(--fs-linen)] focus:outline-none focus:border-gray-500"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Slug</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-[var(--fs-void)] border border-gray-700 rounded-md py-2 px-3 text-[var(--fs-linen)] focus:outline-none focus:border-gray-500"
                  value={formData.slug}
                  onChange={e => setFormData({...formData, slug: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Description</label>
              <textarea 
                required
                rows={4}
                className="w-full bg-[var(--fs-void)] border border-gray-700 rounded-md py-2 px-3 text-[var(--fs-linen)] focus:outline-none focus:border-gray-500"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Base Price (₹)</label>
              <input 
                required
                type="number" 
                min="0"
                step="0.01"
                className="w-full bg-[var(--fs-void)] border border-gray-700 rounded-md py-2 px-3 text-[var(--fs-linen)] focus:outline-none focus:border-gray-500"
                value={formData.basePrice}
                onChange={e => setFormData({...formData, basePrice: e.target.value})}
              />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-medium border-b border-gray-800 pb-2 mb-4">Fabric USP Attributes</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Fabric Type (e.g Cotton, Silk)</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-[var(--fs-void)] border border-gray-700 rounded-md py-2 px-3 text-[var(--fs-linen)] focus:outline-none focus:border-gray-500"
                  value={formData.fabricType}
                  onChange={e => setFormData({...formData, fabricType: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">GSM Weight</label>
                <input 
                  type="text" 
                  className="w-full bg-[var(--fs-void)] border border-gray-700 rounded-md py-2 px-3 text-[var(--fs-linen)] focus:outline-none focus:border-gray-500"
                  value={formData.gsmWeight}
                  onChange={e => setFormData({...formData, gsmWeight: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Weave Type (e.g Twill, Plain)</label>
                <input 
                  type="text" 
                  className="w-full bg-[var(--fs-void)] border border-gray-700 rounded-md py-2 px-3 text-[var(--fs-linen)] focus:outline-none focus:border-gray-500"
                  value={formData.weaveType}
                  onChange={e => setFormData({...formData, weaveType: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Fabric Origin</label>
                <input 
                  type="text" 
                  className="w-full bg-[var(--fs-void)] border border-gray-700 rounded-md py-2 px-3 text-[var(--fs-linen)] focus:outline-none focus:border-gray-500"
                  value={formData.fabricOrigin}
                  onChange={e => setFormData({...formData, fabricOrigin: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Care Instructions</label>
              <textarea 
                rows={2}
                className="w-full bg-[var(--fs-void)] border border-gray-700 rounded-md py-2 px-3 text-[var(--fs-linen)] focus:outline-none focus:border-gray-500"
                value={formData.careInstructions}
                onChange={e => setFormData({...formData, careInstructions: e.target.value})}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <input 
              type="checkbox" 
              id="isActive"
              className="w-4 h-4"
              checked={formData.isActive}
              onChange={e => setFormData({...formData, isActive: e.target.checked})}
            />
            <label htmlFor="isActive" className="text-sm font-medium">Product is actively visible to customers</label>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-3 disabled:opacity-50 bg-[var(--fs-linen)] text-[var(--fs-void)] hover:bg-gray-200 text-sm rounded flex items-center gap-2 font-medium transition shadow-lg"
            >
              {loading ? <span className="animate-spin text-xs">...</span> : <Save className="w-4 h-4" />}
              Save Product
            </button>
          </div>
        </form>
      </div>
    </InventoryAllowed>
  );
}
