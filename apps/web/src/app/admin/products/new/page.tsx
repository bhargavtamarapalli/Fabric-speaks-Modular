'use client';
// app/admin/products/new/page.tsx

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import { productsApi, brandsApi, categoriesApi, templatesApi } from '@/lib/admin/api';
import type { Brand, Category, Variant, VariantTemplate } from '@/lib/admin/types';
import Image from 'next/image';
import {
  PageHeader, SectionCard, ActionButton, FormField, TextInput,
  Textarea, Select, Toggle, useToast, MonoText, Drawer, ConfirmModal,
  formatCurrency,
} from '@/components/admin/shared';
import { mapError } from '@/lib/admin/errors';

import { DEFAULT_SIZES, DEFAULT_COLOURS } from '../_constants/defaults';

const FABRIC_TYPES = ['Linen', 'Cotton', 'Khadi', 'Silk', 'Wool', 'Georgette', 'Chiffon', 'Crepe'];
const WEAVE_TYPES = ['Plain', 'Twill', 'Satin', 'Dobby', 'Jacquard'];
const BREATHABILITY = ['Excellent', 'Good', 'Fair', 'Poor'];

const INITIAL_FORM = {
  name: '',
  description: '',
  brandId: '',
  categoryId: '',
  fabricType: 'Linen',
  gsmWeight: '120',
  weaveType: 'Plain',
  breathabilityRating: 'Excellent',
  careInstructions: '',
  fabricOrigin: 'India',
  isActive: true,
};

type ProductForm = typeof INITIAL_FORM;

interface MatrixCell {
  enabled: boolean; price: string; comparePrice: string; stockQty: string; sku: string;
}
type Matrix = Record<string, Record<string, MatrixCell>>;

type TaxonomyType = 'brand' | 'category';

function generateSku(productName: string, colour: string, size: string): string {
  const p = (productName.slice(0, 3).toUpperCase().replace(/\s/g, '') || 'PRD');
  return `${p}-${colour.slice(0, 3).toUpperCase()}-${size.replace('.', '').replace('m', 'M')}`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function isRequestCancelled(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const lowered = err.message.toLowerCase();
  return lowered.includes('abort') || lowered.includes('canceled') || lowered.includes('cancelled');
}

function VariantMatrix({ productName, sizes, colours, matrix, onChange }: { productName: string; sizes: string[]; colours: string[]; matrix: Matrix; onChange: (m: Matrix) => void }) {
  const toggle = (colour: string, size: string) => {
    const cell = matrix[colour]?.[size] ?? { enabled: false, price: '', comparePrice: '', stockQty: '0', sku: generateSku(productName, colour, size) };
    onChange({ ...matrix, [colour]: { ...matrix[colour], [size]: { ...cell, enabled: !cell.enabled } } });
  };
  const update = (colour: string, size: string, field: keyof MatrixCell, value: string) => {
    const cell = matrix[colour]?.[size] ?? { enabled: false, price: '', comparePrice: '', stockQty: '0', sku: generateSku(productName, colour, size) };
    onChange({ ...matrix, [colour]: { ...matrix[colour], [size]: { ...cell, [field]: value } } });
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse' }} role="grid" aria-label="Product variants matrix">
        <thead>
          <tr>
            <th scope="col" style={{ padding: '6px 10px', textAlign: 'left', color: THEME.colors.muted, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.xs, textTransform: 'uppercase', letterSpacing: '0.06em', borderRight: `1px solid ${THEME.colors.ghost}` }}>Colour / Size</th>
            {sizes.map(s => <th key={s} scope="col" style={{ padding: '6px 8px', textAlign: 'center', color: THEME.colors.muted, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.xs, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {colours.map(colour => (
            <tr key={colour}>
              <th scope="row" style={{ padding: '6px 10px', color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, whiteSpace: 'nowrap', borderRight: `1px solid ${THEME.colors.ghost}`, fontSize: THEME.fontSizes.base, fontWeight: 500 }}>{colour}</th>
              {sizes.map(size => {
                const cell = matrix[colour]?.[size] ?? { enabled: false, price: '', comparePrice: '', stockQty: '0', sku: generateSku(productName, colour, size) };
                const cellId = `cell-${colour}-${size}`;
                return (
                  <td key={size} style={{ padding: '4px 5px', verticalAlign: 'top' }}>
                    <div style={{ width: '88px', background: cell.enabled ? 'rgba(201,169,110,0.05)' : THEME.colors.bg, border: `1px solid ${cell.enabled ? 'rgba(201,169,110,0.2)' : THEME.colors.ghost}`, borderRadius: THEME.radius.sm, padding: '5px', transition: 'all 0.12s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: cell.enabled ? '5px' : 0 }}>
                        <span style={{ fontSize: '10px', color: cell.enabled ? THEME.colors.linen : THEME.colors.muted, fontFamily: THEME.fonts.ui }}>{cell.enabled ? 'Active' : 'Off'}</span>
                        <button
                          onClick={() => toggle(colour, size)}
                          aria-pressed={cell.enabled}
                          aria-label={`${cell.enabled ? 'Disable' : 'Enable'} ${colour} ${size} variant`}
                          style={{ width: '26px', height: '14px', borderRadius: '7px', background: cell.enabled ? THEME.colors.success : THEME.colors.ghost, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', border: 'none', padding: 0 }}
                        >
                          <span aria-hidden="true" style={{ position: 'absolute', top: '2px', left: cell.enabled ? '13px' : '2px', width: '10px', height: '10px', background: 'white', borderRadius: '50%', transition: 'left 0.2s', display: 'block' }} />
                        </button>
                      </div>
                      {cell.enabled && (
                        <>
                          <label className="sr-only" htmlFor={`price-${cellId}`}>Price for {colour} {size}</label>
                          <input
                            id={`price-${cellId}`}
                            type="number"
                            placeholder="₹ Price"
                            value={cell.price}
                            onChange={e => update(colour, size, 'price', e.target.value)}
                            aria-label={`Price for ${colour} ${size}`}
                            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${THEME.colors.ghost}`, color: THEME.colors.ivory, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui, padding: '2px 0', outline: 'none', marginBottom: '3px' }}
                          />
                          <label className="sr-only" htmlFor={`stock-${cellId}`}>Stock for {colour} {size}</label>
                          <input
                            id={`stock-${cellId}`}
                            type="number"
                            placeholder="Stock"
                            value={cell.stockQty}
                            onChange={e => update(colour, size, 'stockQty', e.target.value)}
                            aria-label={`Stock for ${colour} ${size}`}
                            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${THEME.colors.ghost}`, color: THEME.colors.ash, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui, padding: '2px 0', outline: 'none', marginBottom: '3px' }}
                          />
                          <div style={{ fontSize: '9px', color: THEME.colors.muted, fontFamily: THEME.fonts.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} aria-label={`SKU: ${cell.sku}`}>{cell.sku}</div>
                        </>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TaxonomyManagerProps {
  type: TaxonomyType;
  items: Array<{ id: string; name: string }>;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDeactivate: (id: string) => Promise<void>;
}

function TaxonomyManager({ type, items, onCreate, onRename, onDeactivate }: TaxonomyManagerProps) {
  const [newName, setNewName] = useState('');
  const [renameId, setRenameId] = useState('');
  const [renameName, setRenameName] = useState('');
  const [deactivateId, setDeactivateId] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [busy, setBusy] = useState(false);

  const label = type === 'brand' ? 'Brand' : 'Category';

  const handleCreate = async () => {
    const value = newName.trim();
    if (!value) return;
    setBusy(true);
    try {
      await onCreate(value);
      setNewName('');
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async () => {
    const value = renameName.trim();
    if (!renameId || !value) return;
    setBusy(true);
    try {
      await onRename(renameId, value);
      setRenameId('');
      setRenameName('');
    } finally {
      setBusy(false);
    }
  };

  const selected = items.find(i => i.id === renameId);

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <div style={{ display: 'grid', gap: '8px' }}>
        <div style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.sm, fontWeight: 600 }}>
          Add new {label.toLowerCase()}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <TextInput value={newName} onChange={e => setNewName(e.target.value)} placeholder={`Enter ${label.toLowerCase()} name`} />
          <ActionButton onClick={handleCreate} loading={busy}>Add</ActionButton>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        <div style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.sm, fontWeight: 600 }}>
          Rename {label.toLowerCase()}
        </div>
        <Select value={renameId} onChange={e => { setRenameId(e.target.value); setRenameName(items.find(i => i.id === e.target.value)?.name ?? ''); }}>
          <option value="">Select {label.toLowerCase()}</option>
          {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <div style={{ display: 'flex', gap: '8px' }}>
          <TextInput value={renameName} onChange={e => setRenameName(e.target.value)} placeholder={`Rename ${label.toLowerCase()}`} disabled={!renameId} />
          <ActionButton onClick={handleRename} loading={busy} disabled={!renameId || !renameName.trim() || renameName.trim() === selected?.name}>Rename</ActionButton>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        <div style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.sm, fontWeight: 600 }}>
          Deactivate {label.toLowerCase()}
        </div>
        <Select value={deactivateId} onChange={e => setDeactivateId(e.target.value)}>
          <option value="">Select {label.toLowerCase()}</option>
          {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <ActionButton variant="danger" onClick={() => setConfirmDeactivate(true)} disabled={!deactivateId}>
          Deactivate Selected
        </ActionButton>
      </div>

      <ConfirmModal
        open={confirmDeactivate}
        title={`Deactivate ${label}`}
        message={`This will hide the selected ${label.toLowerCase()} from active lists. Continue?`}
        confirmLabel="Deactivate"
        loading={busy}
        onConfirm={async () => {
          if (!deactivateId) return;
          setBusy(true);
          try {
            await onDeactivate(deactivateId);
            setDeactivateId('');
            setConfirmDeactivate(false);
          } finally {
            setBusy(false);
          }
        }}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </div>
  );
}

export default function NewProductPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState(DEFAULT_SIZES);
  const [availableColours, setAvailableColours] = useState(DEFAULT_COLOURS);
  const [selectedSizes, setSelectedSizes] = useState(['1m', '2m', '3m']);
  const [selectedColours, setSelectedColours] = useState(['White', 'Ecru']);
  const [matrix, setMatrix] = useState<Matrix>({});
  const [form, setForm] = useState<ProductForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});
  const [variantError, setVariantError] = useState('');
  
  // Phase 3: Templates
  const [templates, setTemplates] = useState<VariantTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [taxonomyDrawerOpen, setTaxonomyDrawerOpen] = useState(false);
  const [taxonomyType, setTaxonomyType] = useState<TaxonomyType>('brand');

  const refreshBrands = React.useCallback(async (signal?: AbortSignal) => {
    const data = await brandsApi.list(signal);
    if (process.env.NODE_ENV === 'development') {
      console.log('[NEW_PRODUCT] refreshBrands result', { count: data.length, sample: data.slice(0, 3) });
    }
    setBrands(data);
  }, []);

  const refreshCategories = React.useCallback(async (signal?: AbortSignal) => {
    const data = await categoriesApi.list(signal);
    if (process.env.NODE_ENV === 'development') {
      console.log('[NEW_PRODUCT] refreshCategories result', { count: data.length, sample: data.slice(0, 3) });
    }
    setCategories(data);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      const [brandsResult, categoriesResult] = await Promise.allSettled([
        refreshBrands(controller.signal),
        refreshCategories(controller.signal),
      ]);

      if (controller.signal.aborted) return;

      if (brandsResult.status !== 'fulfilled') {
        if (!isRequestCancelled(brandsResult.reason)) {
          console.error('Failed to load brands', brandsResult.reason);
          showToast('Failed to load brands', 'error');
        }
      }
      setBrandsLoading(false);

      if (categoriesResult.status !== 'fulfilled') {
        if (!isRequestCancelled(categoriesResult.reason)) {
          console.error('Failed to load categories', categoriesResult.reason);
          showToast('Failed to load categories', 'error');
        }
      }
      setCategoriesLoading(false);

      if (process.env.NODE_ENV === 'development') {
        console.log('[NEW_PRODUCT] loadData settled', {
          brandsStatus: brandsResult.status,
          categoriesStatus: categoriesResult.status,
        });
      }
    };

    const loadTemplates = async () => {
      try {
        const t = await templatesApi.list();
        if (!controller.signal.aborted) {
          setTemplates(t);
          setTemplatesLoading(false);
        }
      } catch (err) {
        if (isRequestCancelled(err)) return;
        console.error('Failed to load templates', err);
        setTemplatesLoading(false);
      }
    };

    loadData();
    loadTemplates();
    return () => controller.abort();
  }, [showToast, refreshBrands, refreshCategories]);

  const handleCreateBrand = useCallback(async (name: string) => {
    try {
      const slug = slugify(name);
      await brandsApi.create({ name, slug, logoUrl: '', isActive: true });
      await refreshBrands();
      showToast('Brand added', 'success');
    } catch (error) {
      showToast(mapError(error), 'error');
    }
  }, [refreshBrands, showToast]);

  const handleRenameBrand = useCallback(async (id: string, name: string) => {
    try {
      const slug = slugify(name);
      await brandsApi.update(id, { name, slug });
      await refreshBrands();
      if (form.brandId === id) setForm(prev => ({ ...prev, brandId: id }));
      showToast('Brand renamed', 'success');
    } catch (error) {
      showToast(mapError(error), 'error');
    }
  }, [refreshBrands, showToast, form.brandId]);

  const handleDeactivateBrand = useCallback(async (id: string) => {
    try {
      await brandsApi.deactivate(id);
      await refreshBrands();
      if (form.brandId === id) updateField('brandId', '');
      showToast('Brand deactivated', 'success');
    } catch (error) {
      showToast(mapError(error), 'error');
    }
  }, [refreshBrands, showToast, form.brandId]);

  const handleCreateCategory = useCallback(async (name: string) => {
    try {
      const slug = slugify(name);
      await categoriesApi.create({ name, slug, parentId: null, isActive: true });
      await refreshCategories();
      showToast('Category added', 'success');
    } catch (error) {
      showToast(mapError(error), 'error');
    }
  }, [refreshCategories, showToast]);

  const handleRenameCategory = useCallback(async (id: string, name: string) => {
    try {
      const slug = slugify(name);
      await categoriesApi.update(id, { name, slug });
      await refreshCategories();
      if (form.categoryId === id) setForm(prev => ({ ...prev, categoryId: id }));
      showToast('Category renamed', 'success');
    } catch (error) {
      showToast(mapError(error), 'error');
    }
  }, [refreshCategories, showToast, form.categoryId]);

  const handleDeactivateCategory = useCallback(async (id: string) => {
    try {
      await categoriesApi.deactivate(id);
      await refreshCategories();
      if (form.categoryId === id) updateField('categoryId', '');
      showToast('Category deactivated', 'success');
    } catch (error) {
      showToast(mapError(error), 'error');
    }
  }, [refreshCategories, showToast, form.categoryId]);

  const updateField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const handleMatrixChange = (m: Matrix) => {
    setMatrix(m);
    if (variantError) setVariantError('');
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(p => p.includes(size) ? p.filter(x => x !== size) : [...p, size]);
    if (variantError) setVariantError('');
  };

  const toggleColour = (colour: string) => {
    setSelectedColours(p => p.includes(colour) ? p.filter(x => x !== colour) : [...p, colour]);
    if (variantError) setVariantError('');
  };

  const addCustomSize = () => {
    const custom = window.prompt('Enter custom size (e.g. 15m, XXXL, Free Size):');
    if (custom && custom.trim() && !availableSizes.includes(custom.trim())) {
      const val = custom.trim();
      setAvailableSizes((p: string[]) => [...p, val]);
      setSelectedSizes((p: string[]) => [...p, val]);
    }
  };

  const addCustomColour = () => {
    const custom = window.prompt('Enter custom colour name (e.g. Crimson Red, Golden):');
    if (custom && custom.trim() && !availableColours.includes(custom.trim())) {
      const val = custom.trim();
      setAvailableColours((p: string[]) => [...p, val]);
      setSelectedColours((p: string[]) => [...p, val]);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Ensure all sizes from template are in availableSizes
    const newAvailableSizes = [...availableSizes];
    template.sizes.forEach(s => { if (!newAvailableSizes.includes(s)) newAvailableSizes.push(s); });
    setAvailableSizes(newAvailableSizes);
    setSelectedSizes(template.sizes);

    // Ensure all colours from template are in availableColours
    const newAvailableColours = [...availableColours];
    template.colours.forEach(c => { if (!newAvailableColours.includes(c)) newAvailableColours.push(c); });
    setAvailableColours(newAvailableColours);
    setSelectedColours(template.colours);

    showToast(`Template "${template.name}" applied`, 'success');
  };

  const handleSaveAsTemplate = async () => {
    if (!selectedSizes.length || !selectedColours.length) {
      showToast('Select at least one size and colour to save as template', 'error');
      return;
    }

    const name = window.prompt('Enter a name for this variant template:');
    if (!name || !name.trim()) return;

    try {
      setIsSavingTemplate(true);
      const newTemplate = await templatesApi.create({
        name: name.trim(),
        sizes: selectedSizes,
        colours: selectedColours,
      });
      setTemplates(p => [...p, newTemplate]);
      showToast('Template saved successfully', 'success');
    } catch (err) {
      showToast(mapError(err), 'error');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const validate = (values: ProductForm) => {
    const next: Partial<Record<keyof ProductForm, string>> = {};
    const gsmValue = Number(values.gsmWeight);
    if (!values.name.trim()) next.name = 'Product name is required';
    if (!values.brandId) next.brandId = 'Brand is required';
    if (!values.categoryId) next.categoryId = 'Category is required';
    if (!values.gsmWeight.trim()) next.gsmWeight = 'GSM weight is required';
    if (values.gsmWeight && (Number.isNaN(gsmValue) || gsmValue <= 0)) next.gsmWeight = 'GSM weight must be a positive number';
    return next;
  };

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setImageFiles(p => [...p, ...files].slice(0, 6));
    files.forEach(f => { const r = new FileReader(); r.onload = ev => setImagePreviews(p => [...p, ev.target?.result as string].slice(0, 6)); r.readAsDataURL(f); });
  };

  const buildVariants = useMemo(() => {
    const vars: Variant[] = [];
    for (const colour of selectedColours) for (const size of selectedSizes) {
      const cell = matrix[colour]?.[size];
      if (!cell?.enabled || !cell.price) continue;
      vars.push({ id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, size, colour, sku: cell.sku, price: parseFloat(cell.price), comparePrice: cell.comparePrice ? parseFloat(cell.comparePrice) : null, stockQty: parseInt(cell.stockQty, 10) || 0, colourImageUrl: null, version: 1 });
    }
    return vars;
  }, [selectedColours, selectedSizes, matrix]);

  const handleSave = async () => {
    const validationErrors = validate(form);
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      return;
    }
    // Check for images - if not, show toast error
    if (!imageFiles.length) {
      showToast('At least one image is required', 'error');
      return;
    }
    const variants = buildVariants;
    if (!variants.length) { setVariantError('Enable at least one variant with a price'); return; }
    setVariantError('');
    try {
      setSaving(true);
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        try {
          // uploadImage returns Promise<string> - the image URL directly
          const imageUrl = await productsApi.uploadImage(file);

          // Validate upload response (I3-3)
          if (!imageUrl || typeof imageUrl !== 'string') {
            console.error('Upload response missing URL:', imageUrl);
            throw new Error(`Failed to upload ${file.name}: server did not return image URL`);
          }

          imageUrls.push(imageUrl);
        } catch (uploadError: any) {
          throw new Error(`Image upload failed: ${uploadError.message || 'unknown error'}`);
        }
      }

      await productsApi.create({ ...form, gsmWeight: parseInt(form.gsmWeight, 10), brandName: brands.find(b => b.id === form.brandId)?.name ?? '', categoryName: categories.find(c => c.id === form.categoryId)?.name ?? '', variants, images: imageUrls });
      showToast('Product created', 'success');
      router.push('/admin/products');
    } catch (e: any) { showToast(mapError(e), 'error'); }
    finally { setSaving(false); }
  };

  const chip = (label: string, selected: boolean, onClick: () => void) => (
    <div onClick={onClick} style={{ padding: '4px 10px', borderRadius: THEME.radius.sm, cursor: 'pointer', border: `1px solid ${selected ? 'rgba(201,169,110,0.3)' : THEME.colors.ghost}`, background: selected ? 'rgba(201,169,110,0.08)' : 'transparent', color: selected ? THEME.colors.linen : THEME.colors.ash, fontSize: THEME.fontSizes.sm, fontFamily: THEME.fonts.ui, transition: 'all 0.12s' }}>{label}</div>
  );

  return (
    <div>
      <PageHeader title="New product" action={
        <div style={{ display: 'flex', gap: '8px' }}>
          <ActionButton type="button" variant="ghost" onClick={() => router.replace('/admin/products')}>Cancel</ActionButton>
          <ActionButton onClick={handleSave} loading={saving}>Save product</ActionButton>
        </div>
      } />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SectionCard title="Product information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <FormField label="Product name" required error={errors.name} errorId="product-name-error">
                <TextInput
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'product-name-error' : undefined}
                />
              </FormField>
              <FormField label="Description">
                <Textarea value={form.description} onChange={e => updateField('description', e.target.value)} rows={3} />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '10px' }}>
                <FormField label="Brand" required error={errors.brandId} errorId="product-brand-error">
                  <Select
                    value={form.brandId}
                    onChange={e => updateField('brandId', e.target.value)}
                    disabled={brandsLoading}
                    aria-invalid={!!errors.brandId}
                    aria-describedby={errors.brandId ? 'product-brand-error' : undefined}
                  >
                    <option value="">{brandsLoading ? 'Loading brands...' : 'Select brand'}</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    {!brandsLoading && brands.length === 0 && (
                      <option value="" disabled>No brands found. Use "Manage brands".</option>
                    )}
                  </Select>
                  <div style={{ marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => { setTaxonomyType('brand'); setTaxonomyDrawerOpen(true); }}
                      style={{ background: 'transparent', border: 'none', color: THEME.colors.linen, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.xs, cursor: 'pointer', padding: 0 }}
                    >
                      Manage brands
                    </button>
                  </div>
                </FormField>
                <FormField label="Category" required error={errors.categoryId} errorId="product-category-error">
                  <Select
                    value={form.categoryId}
                    onChange={e => updateField('categoryId', e.target.value)}
                    disabled={categoriesLoading}
                    aria-invalid={!!errors.categoryId}
                    aria-describedby={errors.categoryId ? 'product-category-error' : undefined}
                  >
                    <option value="">{categoriesLoading ? 'Loading categories...' : 'Select category'}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    {!categoriesLoading && categories.length === 0 && (
                      <option value="" disabled>No categories found. Use "Manage categories".</option>
                    )}
                  </Select>
                  <div style={{ marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => { setTaxonomyType('category'); setTaxonomyDrawerOpen(true); }}
                      style={{ background: 'transparent', border: 'none', color: THEME.colors.linen, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.xs, cursor: 'pointer', padding: 0 }}
                    >
                      Manage categories
                    </button>
                  </div>
                </FormField>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Fabric details">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '12px' }}>
              <FormField label="Fabric type">
                <Select value={form.fabricType} onChange={e => updateField('fabricType', e.target.value)}>
                  {FABRIC_TYPES.map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="GSM weight" error={errors.gsmWeight} errorId="product-gsm-error">
                <TextInput
                  type="number"
                  value={form.gsmWeight}
                  suffix="GSM"
                  onChange={e => updateField('gsmWeight', e.target.value)}
                  aria-invalid={!!errors.gsmWeight}
                  aria-describedby={errors.gsmWeight ? 'product-gsm-error' : undefined}
                />
              </FormField>
              <FormField label="Weave type">
                <Select value={form.weaveType} onChange={e => updateField('weaveType', e.target.value)}>
                  {WEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Breathability">
                <Select value={form.breathabilityRating} onChange={e => updateField('breathabilityRating', e.target.value)}>
                  {BREATHABILITY.map(t => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Origin">
                <TextInput value={form.fabricOrigin} onChange={e => updateField('fabricOrigin', e.target.value)} />
              </FormField>
            </div>
            <div style={{ marginTop: '12px' }}>
              <FormField label="Care instructions">
                <Textarea value={form.careInstructions} onChange={e => updateField('careInstructions', e.target.value)} rows={2} />
              </FormField>
            </div>
          </SectionCard>
          <SectionCard title="Variants">
            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(201,169,110,0.03)', borderRadius: THEME.radius.md, border: `1px solid ${THEME.colors.ghost}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontWeight: 500 }}>Quick Templates</div>
                <button 
                  onClick={handleSaveAsTemplate} 
                  disabled={isSavingTemplate}
                  style={{ background: 'transparent', border: `1px solid ${THEME.colors.linen}40`, color: THEME.colors.linen, fontSize: THEME.fontSizes.xs, cursor: 'pointer', fontFamily: THEME.fonts.ui, padding: '4px 8px', borderRadius: THEME.radius.sm }}
                >
                  {isSavingTemplate ? 'Saving...' : 'Save Current as Template'}
                </button>
              </div>
              <Select 
                onChange={(e) => handleApplyTemplate(e.target.value)}
                defaultValue=""
                style={{ background: THEME.colors.bg, fontSize: THEME.fontSizes.sm }}
              >
                <option value="" disabled>{templatesLoading ? 'Loading templates...' : templates.length ? 'Select a preset template...' : 'No templates saved yet'}</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.sizes.length} sizes, {t.colours.length} colours)</option>
                ))}
              </Select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sizes</div>
                <button onClick={addCustomSize} style={{ background: 'transparent', border: 'none', color: THEME.colors.linen, fontSize: THEME.fontSizes.xs, cursor: 'pointer', fontFamily: THEME.fonts.ui }}>+ Add Custom</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {availableSizes.map((s: string) => <React.Fragment key={s}>{chip(s, selectedSizes.includes(s), () => toggleSize(s))}</React.Fragment>)}
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Colours</div>
                <button onClick={addCustomColour} style={{ background: 'transparent', border: 'none', color: THEME.colors.linen, fontSize: THEME.fontSizes.xs, cursor: 'pointer', fontFamily: THEME.fonts.ui }}>+ Add Custom</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {availableColours.map((c: string) => <React.Fragment key={c}>{chip(c, selectedColours.includes(c), () => toggleColour(c))}</React.Fragment>)}
              </div>
            </div>
            {selectedSizes.length && selectedColours.length ? (
              <VariantMatrix productName={form.name} sizes={selectedSizes} colours={selectedColours} matrix={matrix} onChange={handleMatrixChange} />
            ) : (
              <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.sm, fontFamily: THEME.fonts.ui }}>Select sizes and colours above to configure variants</div>
            )}
            {variantError && <div style={{ color: THEME.colors.error, fontSize: THEME.fontSizes.sm, fontFamily: THEME.fonts.ui }}>{variantError}</div>}
          </SectionCard>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SectionCard title="Visibility">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui }}>Active on storefront</div>
                <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui, marginTop: '2px' }}>Customers can find and buy this product</div>
              </div>
              <Toggle checked={form.isActive} onChange={v => updateField('isActive', v)} />
            </div>
          </SectionCard>
          <SectionCard title={`Images (${imagePreviews.length}/6)`}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '8px', marginBottom: '8px' }}>
              {imagePreviews.map((src, i) => (
                <div key={i} style={{ aspectRatio: '1', borderRadius: THEME.radius.md, overflow: 'hidden', border: `1px solid ${THEME.colors.border}`, position: 'relative' }}>
                  <Image
                    src={src}
                    alt=""
                    fill
                    unoptimized
                    style={{ objectFit: 'cover' }}
                  />
                  <button onClick={() => { setImagePreviews(p => p.filter((_, j) => j !== i)); setImageFiles(p => p.filter((_, j) => j !== i)); }} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, zIndex: 1 }}>×</button>
                </div>
              ))}
              {imagePreviews.length < 6 && (
                <label htmlFor="product-images" style={{ aspectRatio: '1', borderRadius: THEME.radius.md, border: `1px dashed ${THEME.colors.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexDirection: 'column', gap: 4 }}>
                  <span style={{ color: THEME.colors.muted, fontSize: 20 }} aria-hidden="true">+</span>
                  <span style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui }}>Add image</span>
                  <input
                    id="product-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageAdd}
                    style={{ display: 'none' }}
                    aria-label="Upload product images"
                  />
                </label>
              )}
            </div>
            <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>JPG, PNG, WebP. Converted to WebP on upload.</div>
          </SectionCard>
          {buildVariants.length > 0 && (
            <SectionCard title={`Variant summary (${buildVariants.length})`} noPadding>
              {buildVariants.slice(0, 6).map((v: Variant) => (
                <div key={v.sku} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: `1px solid ${THEME.colors.ghost}20` }}>
                  <div>
                    <MonoText color={THEME.colors.muted}>{v.sku}</MonoText>
                    <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>{v.colour} · {v.size} · {v.stockQty} units</div>
                  </div>
                  <span style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.sm }}>{formatCurrency(v.price)}</span>
                </div>
              ))}
              {buildVariants.length > 6 && <div style={{ padding: '8px 14px', fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>+{buildVariants.length - 6} more variants</div>}
            </SectionCard>
          )}
        </div>
      </div>
      <Drawer
        open={taxonomyDrawerOpen}
        onClose={() => setTaxonomyDrawerOpen(false)}
        title={taxonomyType === 'brand' ? 'Manage Brands' : 'Manage Categories'}
      >
        {taxonomyType === 'brand' ? (
          <TaxonomyManager
            type="brand"
            items={brands.map(({ id, name }) => ({ id, name }))}
            onCreate={handleCreateBrand}
            onRename={handleRenameBrand}
            onDeactivate={handleDeactivateBrand}
          />
        ) : (
          <TaxonomyManager
            type="category"
            items={categories.map(({ id, name }) => ({ id, name }))}
            onCreate={handleCreateCategory}
            onRename={handleRenameCategory}
            onDeactivate={handleDeactivateCategory}
          />
        )}
      </Drawer>
      {ToastComponent}
    </div>
  );
}
