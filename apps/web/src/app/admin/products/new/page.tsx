'use client';
// app/admin/products/new/page.tsx

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/admin/theme';
import { productsApi, brandsApi, categoriesApi } from '@/lib/admin/api';
import type { Brand, Category, Variant } from '@/lib/admin/types';
import {
  PageHeader, SectionCard, ActionButton, FormField, TextInput,
  Textarea, Select, Toggle, useToast, ErrorBanner, MonoText,
  formatCurrency,
} from '@/components/admin/shared';

const SIZES   = ['0.5m','1m','1.5m','2m','2.5m','3m','5m','10m'];
const COLOURS = ['White','Off-white','Ecru','Beige','Grey','Black','Navy','Olive','Rust','Indigo'];
const FABRIC_TYPES  = ['Linen','Cotton','Khadi','Silk','Wool','Georgette','Chiffon','Crepe'];
const WEAVE_TYPES   = ['Plain','Twill','Satin','Dobby','Jacquard'];
const BREATHABILITY = ['Excellent','Good','Fair','Poor'];

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

function generateSku(productName: string, colour: string, size: string): string {
  const p = (productName.slice(0,3).toUpperCase().replace(/\s/g,'') || 'PRD');
  return `${p}-${colour.slice(0,3).toUpperCase()}-${size.replace('.','').replace('m','M')}`;
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
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ padding: '6px 10px', textAlign: 'left', color: THEME.colors.muted, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.xs, textTransform: 'uppercase', letterSpacing: '0.06em', borderRight: `1px solid ${THEME.colors.ghost}` }}>Colour / Size</th>
            {sizes.map(s => <th key={s} style={{ padding: '6px 8px', textAlign: 'center', color: THEME.colors.muted, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.xs, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {colours.map(colour => (
            <tr key={colour}>
              <td style={{ padding: '6px 10px', color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, whiteSpace: 'nowrap', borderRight: `1px solid ${THEME.colors.ghost}`, fontSize: THEME.fontSizes.base }}>{colour}</td>
              {sizes.map(size => {
                const cell = matrix[colour]?.[size] ?? { enabled: false, price: '', comparePrice: '', stockQty: '0', sku: generateSku(productName, colour, size) };
                return (
                  <td key={size} style={{ padding: '4px 5px', verticalAlign: 'top' }}>
                    <div style={{ width: '88px', background: cell.enabled ? 'rgba(201,169,110,0.05)' : THEME.colors.bg, border: `1px solid ${cell.enabled ? 'rgba(201,169,110,0.2)' : THEME.colors.ghost}`, borderRadius: THEME.radius.sm, padding: '5px', transition: 'all 0.12s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: cell.enabled ? '5px' : 0 }}>
                        <span style={{ fontSize: '10px', color: cell.enabled ? THEME.colors.linen : THEME.colors.muted, fontFamily: THEME.fonts.ui }}>{cell.enabled ? 'Active' : 'Off'}</span>
                        <div onClick={() => toggle(colour, size)} style={{ width: '26px', height: '14px', borderRadius: '7px', background: cell.enabled ? THEME.colors.success : THEME.colors.ghost, cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                          <div style={{ position: 'absolute', top: '2px', left: cell.enabled ? '13px' : '2px', width: '10px', height: '10px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                        </div>
                      </div>
                      {cell.enabled && (
                        <>
                          <input type="number" placeholder="₹ Price" value={cell.price} onChange={e => update(colour, size, 'price', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${THEME.colors.ghost}`, color: THEME.colors.ivory, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui, padding: '2px 0', outline: 'none', marginBottom: '3px' }} />
                          <input type="number" placeholder="Stock" value={cell.stockQty} onChange={e => update(colour, size, 'stockQty', e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${THEME.colors.ghost}`, color: THEME.colors.ash, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui, padding: '2px 0', outline: 'none', marginBottom: '3px' }} />
                          <div style={{ fontSize: '9px', color: THEME.colors.muted, fontFamily: THEME.fonts.mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cell.sku}</div>
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

export default function NewProductPage() {
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  const [brands,     setBrands]     = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving,     setSaving]     = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedSizes,   setSelectedSizes]   = useState(['1m','2m','3m']);
  const [selectedColours, setSelectedColours] = useState(['White','Ecru']);
  const [matrix, setMatrix] = useState<Matrix>({});
  const [form, setForm] = useState<ProductForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});
  const [variantError, setVariantError] = useState('');

  useEffect(() => {
    Promise.all([brandsApi.list(), categoriesApi.list()]).then(([b,c]) => { setBrands(b); setCategories(c); });
  }, []);

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
    setImageFiles(p => [...p, ...files].slice(0,6));
    files.forEach(f => { const r = new FileReader(); r.onload = ev => setImagePreviews(p => [...p, ev.target?.result as string].slice(0,6)); r.readAsDataURL(f); });
  };

  const buildVariants = () => {
    const vars: Variant[] = [];
    for (const colour of selectedColours) for (const size of selectedSizes) {
      const cell = matrix[colour]?.[size];
      if (!cell?.enabled || !cell.price) continue;
      vars.push({ id: `var-${Date.now()}-${Math.random().toString(36).substr(2,9)}`, size, colour, sku: cell.sku, price: parseFloat(cell.price), comparePrice: cell.comparePrice ? parseFloat(cell.comparePrice) : null, stockQty: parseInt(cell.stockQty,10)||0, colourImageUrl: null, version: 1 });
    }
    return vars;
  };

  const handleSave = async () => {
    const validationErrors = validate(form);
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      return;
    }
    const variants = buildVariants();
    if (!variants.length) { setVariantError('Enable at least one variant with a price'); return; }
    setVariantError('');
    try {
      setSaving(true);
      const imageUrls: string[] = [];
      for (const file of imageFiles) imageUrls.push(await productsApi.uploadImage(file));
      await productsApi.create({ ...form, gsmWeight: parseInt(form.gsmWeight,10), brandName: brands.find(b=>b.id===form.brandId)?.name??'', categoryName: categories.find(c=>c.id===form.categoryId)?.name??'', variants, images: imageUrls });
      showToast('Product created', 'success');
      router.push('/admin/products');
    } catch (e: any) { showToast(e.message ?? 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const chip = (label: string, selected: boolean, onClick: () => void) => (
    <div onClick={onClick} style={{ padding: '4px 10px', borderRadius: THEME.radius.sm, cursor: 'pointer', border: `1px solid ${selected ? 'rgba(201,169,110,0.3)' : THEME.colors.ghost}`, background: selected ? 'rgba(201,169,110,0.08)' : 'transparent', color: selected ? THEME.colors.linen : THEME.colors.ash, fontSize: THEME.fontSizes.sm, fontFamily: THEME.fonts.ui, transition: 'all 0.12s' }}>{label}</div>
  );

  return (
    <div>
      <PageHeader title="New product" action={
        <div style={{ display: 'flex', gap: '8px' }}>
          <ActionButton variant="ghost" onClick={() => router.push('/admin/products')}>Cancel</ActionButton>
          <ActionButton onClick={handleSave} loading={saving}>Save product</ActionButton>
        </div>
      } />
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <FormField label="Brand" required error={errors.brandId} errorId="product-brand-error">
                  <Select
                    value={form.brandId}
                    onChange={e => updateField('brandId', e.target.value)}
                    aria-invalid={!!errors.brandId}
                    aria-describedby={errors.brandId ? 'product-brand-error' : undefined}
                  >
                    <option value="">Select brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                </FormField>
                <FormField label="Category" required error={errors.categoryId} errorId="product-category-error">
                  <Select
                    value={form.categoryId}
                    onChange={e => updateField('categoryId', e.target.value)}
                    aria-invalid={!!errors.categoryId}
                    aria-describedby={errors.categoryId ? 'product-category-error' : undefined}
                  >
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </FormField>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Fabric details">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sizes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>{SIZES.map(s => chip(s, selectedSizes.includes(s), () => toggleSize(s)))}</div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Colours</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>{COLOURS.map(c => chip(c, selectedColours.includes(c), () => toggleColour(c)))}</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              {imagePreviews.map((src,i) => (
                <div key={i} style={{ aspectRatio: '1', borderRadius: THEME.radius.md, overflow: 'hidden', border: `1px solid ${THEME.colors.border}`, position: 'relative' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => { setImagePreviews(p=>p.filter((_,j)=>j!==i)); setImageFiles(p=>p.filter((_,j)=>j!==i)); }} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}>×</button>
                </div>
              ))}
              {imagePreviews.length < 6 && (
                <label style={{ aspectRatio: '1', borderRadius: THEME.radius.md, border: `1px dashed ${THEME.colors.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexDirection: 'column', gap: 4 }}>
                  <span style={{ color: THEME.colors.muted, fontSize: 20 }}>+</span>
                  <span style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui }}>Add image</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageAdd} style={{ display: 'none' }} />
                </label>
              )}
            </div>
            <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>JPG, PNG, WebP. Converted to WebP on upload.</div>
          </SectionCard>
          {buildVariants().length > 0 && (
            <SectionCard title={`Variant summary (${buildVariants().length})`} noPadding>
              {buildVariants().slice(0,6).map(v => (
                <div key={v.sku} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: `1px solid ${THEME.colors.ghost}20` }}>
                  <div>
                    <MonoText color={THEME.colors.muted}>{v.sku}</MonoText>
                    <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>{v.colour} · {v.size} · {v.stockQty} units</div>
                  </div>
                  <span style={{ color: THEME.colors.ivory, fontFamily: THEME.fonts.ui, fontSize: THEME.fontSizes.sm }}>{formatCurrency(v.price)}</span>
                </div>
              ))}
              {buildVariants().length > 6 && <div style={{ padding: '8px 14px', fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui }}>+{buildVariants().length-6} more variants</div>}
            </SectionCard>
          )}
        </div>
      </div>
      {ToastComponent}
    </div>
  );
}
