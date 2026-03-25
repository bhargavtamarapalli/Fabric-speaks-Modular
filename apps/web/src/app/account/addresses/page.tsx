'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { ConfirmModal } from '@/components/organisms/ConfirmModal';
import { getAddresses, deleteAddress, setDefaultAddress, Address } from '@/lib/api/addresses';
import { Plus, Trash2, MapPin, CheckCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

const containerVars = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};

const itemVars = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteAddressId, setDeleteAddressId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { showToast } = useToast();
  const isMountedRef = useRef(true);

  // Cleanup callback to mark component as unmounted
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      setLoading(true);
      const res = await getAddresses();
      if (!isMountedRef.current) return;
      setAddresses(res);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      showToast(err.message || "Failed to load addresses", "error");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress(id);
      if (!isMountedRef.current) return;
      showToast("Default address updated", "success");
      // Sequential await: first update, then reload
      await loadData();
    } catch (err: any) {
      if (!isMountedRef.current) return;
      showToast(err.message || 'Failed to update default address', 'error');
    }
  };

  const handleDelete = async (id: string, isDefault: boolean) => {
    if (isDefault) {
        showToast('Cannot delete default address.', 'error');
        return;
    }
    // Show confirmation modal
    setDeleteAddressId(id);
    setDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteAddressId) return;

    try {
      setDeleteLoading(true);
      await deleteAddress(deleteAddressId);
      if (!isMountedRef.current) return;
      setAddresses(prev => prev.filter(a => a.id !== deleteAddressId));
      showToast("Address removed", "success");
      setDeleteConfirm(false);
      setDeleteAddressId(null);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      showToast(err.message || 'Failed to delete address', 'error');
      setDeleteConfirm(false);
      setDeleteAddressId(null);
    } finally {
      if (isMountedRef.current) {
        setDeleteLoading(false);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-serif text-[var(--fs-linen)]">Saved Addresses</h2>
          <p className="text-sm text-gray-400 mt-1">Manage delivery locations for faster checkout.</p>
        </div>
        {/* Placeholder for real add address logic */}
        <button 
          onClick={() => showToast('Feature coming soon: Address creation drawer.', 'info')}
          className="flex items-center gap-2 px-4 py-2 uppercase tracking-widest text-xs font-medium bg-[var(--fs-linen)] text-[var(--fs-void)] hover:bg-gray-200 transition"
        >
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><SpiderLoader size="md" /></div>
      ) : addresses.length === 0 ? (
        <div className="py-12 border border-dashed border-[var(--fs-wire)] rounded flex flex-col items-center justify-center text-center">
          <MapPin className="w-12 h-12 text-[var(--fs-ash)] mb-3" />
          <p className="text-[var(--fs-ash)]">You have no saved addresses yet.</p>
        </div>
      ) : (
        <motion.div 
          variants={containerVars} 
          initial="hidden" 
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {addresses.map((addr) => (
            <motion.div 
              key={addr.id} 
              variants={itemVars} 
              className={`relative p-5 border rounded-sm flex flex-col gap-4 transition-colors ${
                addr.isDefault ? 'border-[var(--fs-linen)] bg-gray-900/40' : 'border-[var(--fs-wire)] bg-[var(--fs-void)]'
              }`}
            >
              {addr.isDefault && (
                <div className="absolute top-4 right-4 flex items-center gap-1 text-[var(--fs-linen)] text-xs font-medium uppercase tracking-widest">
                  <CheckCircle className="w-3 h-3" /> Default
                </div>
              )}
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--fs-ash)] mb-1">{addr.label}</div>
                <h3 className="text-lg font-medium text-[var(--fs-ivory)]">{addr.fullName}</h3>
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                  {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                  {addr.city}, {addr.state} - {addr.pincode}
                </p>
              </div>
              <div className="flex items-center gap-4 mt-auto pt-4 border-t border-[var(--fs-wire)]">
                {!addr.isDefault && (
                  <button 
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-xs uppercase tracking-widest text-[var(--fs-linen)] hover:text-white transition font-medium"
                  >
                    Set as Default
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(addr.id, addr.isDefault)}
                  className="text-xs uppercase tracking-widest text-red-500 hover:text-red-400 transition ml-auto flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteConfirm}
        title="Delete Address"
        message="Are you sure you want to permanently delete this address? This action cannot be undone."
        confirmText="Delete Address"
        cancelText="Cancel"
        isDestructive={true}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirm(false);
          setDeleteAddressId(null);
        }}
      />
    </div>
  );
}
