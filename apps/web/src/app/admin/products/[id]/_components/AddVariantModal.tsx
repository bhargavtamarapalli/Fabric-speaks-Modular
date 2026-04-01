'use client';

import React, { useState, useEffect } from 'react';
import { THEME } from '@/lib/admin/theme';
import type { Product } from '@/lib/admin/types';
import { productsApi } from '@/lib/admin/api';
import { 
  Drawer, FormField, TextInput, ActionButton, SectionCard 
} from '@/components/admin/shared';
import { DEFAULT_SIZES, DEFAULT_COLOURS } from '../../_constants/defaults';

interface AddVariantModalProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  onSuccess: () => void;
}

function generateSku(productName: string, colour: string, size: string): string {
  const p = (productName.slice(0, 3).toUpperCase().replace(/\s/g, '') || 'PRD');
  return `${p}-${colour.slice(0, 3).toUpperCase()}-${size.replace('.', '').replace('m', 'M')}`;
}

export function AddVariantModal({ open, onClose, product, onSuccess }: AddVariantModalProps) {
  const [availableSizes, setAvailableSizes] = useState(DEFAULT_SIZES);
  const [availableColours, setAvailableColours] = useState(DEFAULT_COLOURS);
  
  const [form, setForm] = useState({
    size: '',
    colour: '',
    sku: '',
    price: '',
    comparePrice: '',
    stockQty: '0',
  });

  const [customSize, setCustomSize] = useState('');
  const [showCustomSizeInput, setShowCustomSizeInput] = useState(false);
  const [customColour, setCustomColour] = useState('');
  const [showCustomColourInput, setShowCustomColourInput] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Auto-generate SKU when size or colour changes
  useEffect(() => {
    if (form.size && form.colour) {
      setForm(prev => ({
        ...prev,
        sku: generateSku(product.name, prev.colour, prev.size)
      }));
    }
  }, [form.size, form.colour, product.name]);

  const handleAddCustomSize = () => {
    const val = customSize.trim();
    if (val && !availableSizes.includes(val)) {
      setAvailableSizes(p => [...p, val]);
      setForm(prev => ({ ...prev, size: val }));
      setCustomSize('');
      setShowCustomSizeInput(false);
    }
  };

  const handleAddCustomColour = () => {
    const val = customColour.trim();
    if (val && !availableColours.includes(val)) {
      setAvailableColours(p => [...p, val]);
      setForm(prev => ({ ...prev, colour: val }));
      setCustomColour('');
      setShowCustomColourInput(false);
    }
  };

  const handleSave = async () => {
    if (!form.size || !form.colour || !form.sku || !form.price) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await productsApi.createVariant(product.id, {
        size: form.size,
        colour: form.colour,
        sku: form.sku,
        price: Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
        stockQty: Number(form.stockQty),
      });
      onSuccess();
      onClose();
      // Reset form
      setForm({
        size: '',
        colour: '',
        sku: '',
        price: '',
        comparePrice: '',
        stockQty: '0',
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to add variant');
      }
    } finally {
      setSaving(false);
    }
  };

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        padding: '6px 10px',
        borderRadius: THEME.radius.sm,
        fontSize: THEME.fontSizes.xs,
        fontFamily: THEME.fonts.ui,
        cursor: 'pointer',
        border: `1px solid ${active ? THEME.colors.linen : THEME.colors.border2}`,
        background: active ? 'rgba(201,169,110,0.1)' : THEME.colors.bg,
        color: active ? THEME.colors.linen : THEME.colors.ash,
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  );

  return (
    <Drawer open={open} onClose={onClose} title="Add New Variant">
      <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.md }}>
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Size</div>
            {availableSizes.map(s => chip(s, form.size === s, () => setForm(p => ({ ...p, size: s }))))}
          </div>
          {showCustomSizeInput ? (
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <TextInput 
                placeholder="e.g. XXXL or 15m" 
                value={customSize} 
                onChange={e => setCustomSize(e.target.value)}
                autoFocus
              />
              <ActionButton variant="primary" onClick={handleAddCustomSize} style={{ width: 'auto' }}>Add</ActionButton>
              <ActionButton variant="ghost" onClick={() => setShowCustomSizeInput(false)} style={{ width: 'auto' }}>Cancel</ActionButton>
            </div>
          ) : (
            <button 
              onClick={() => setShowCustomSizeInput(true)} 
              style={{ background: 'transparent', border: 'none', color: THEME.colors.linen, fontSize: THEME.fontSizes.xs, cursor: 'pointer', marginTop: '8px' }}
            >
              + Add Custom Size
            </button>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Colour</div>
            {availableColours.map(c => chip(c, form.colour === c, () => setForm(p => ({ ...p, colour: c }))))}
          </div>
          {showCustomColourInput ? (
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <TextInput 
                placeholder="e.g. Royal Blue" 
                value={customColour} 
                onChange={e => setCustomColour(e.target.value)}
                autoFocus
              />
              <ActionButton variant="primary" onClick={handleAddCustomColour} style={{ width: 'auto' }}>Add</ActionButton>
              <ActionButton variant="ghost" onClick={() => setShowCustomColourInput(false)} style={{ width: 'auto' }}>Cancel</ActionButton>
            </div>
          ) : (
            <button 
              onClick={() => setShowCustomColourInput(true)} 
              style={{ background: 'transparent', border: 'none', color: THEME.colors.linen, fontSize: THEME.fontSizes.xs, cursor: 'pointer', marginTop: '8px' }}
            >
              + Add Custom Colour
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: THEME.spacing.md }}>
          <FormField label="SKU (Auto)" required>
            <TextInput value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} />
          </FormField>
          <FormField label="Price" required>
            <TextInput value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} type="number" />
          </FormField>
          <FormField label="Compare Price">
            <TextInput value={form.comparePrice} onChange={e => setForm(p => ({ ...p, comparePrice: e.target.value }))} type="number" />
          </FormField>
          <FormField label="Initial Stock" required>
            <TextInput value={form.stockQty} onChange={e => setForm(p => ({ ...p, stockQty: e.target.value }))} type="number" />
          </FormField>
        </div>

        {error && <div style={{ color: THEME.colors.error, fontSize: THEME.fontSizes.xs }}>{error}</div>}

        <ActionButton onClick={handleSave} loading={saving}>Add Variant</ActionButton>
      </div>
    </Drawer>
  );
}
