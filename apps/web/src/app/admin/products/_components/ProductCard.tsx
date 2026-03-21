'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { THEME, css } from '@/lib/admin/theme';
import type { Product } from '@/lib/admin/types';
import { Badge, formatCurrency } from '@/components/admin/shared';

interface ProductCardProps {
  product: Product;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onRemove: (id: string) => void;
}

function StockBadge({ product }: { product: Product }) {
  const stocks = product.variants.map(v => v.stockQty);
  if (stocks.every(s => s === 0)) return <Badge type="critical">Out of stock</Badge>;
  if (stocks.some(s => s > 0 && s < 5)) return <Badge type="warning">Low stock</Badge>;
  return <Badge type="healthy">In stock</Badge>;
}

export function ProductCard({ product, isHovered, onHover, onRemove }: ProductCardProps) {
  const router = useRouter();

  const minPrice = Math.min(...product.variants.map(v => v.price));
  const maxPrice = Math.max(...product.variants.map(v => v.price));
  
  const priceRange = minPrice === maxPrice 
    ? formatCurrency(minPrice) 
    : `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`;

  return (
    <div
      onMouseEnter={() => onHover(product.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        background:   THEME.colors.surface3,
        border:       `1px solid ${isHovered ? THEME.colors.border2 : THEME.colors.border}`,
        borderRadius: THEME.radius.lg,
        overflow:     'hidden',
        transition:   'border-color 0.12s, transform 0.12s',
        transform:    isHovered ? 'translateY(-1px)' : 'none',
        cursor:       'pointer',
      }}
      onClick={() => router.push(`/admin/products/${product.id}`)}
    >
      {/* Image Container */}
      <div style={{ 
        height: '120px', 
        background: THEME.colors.bg, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        borderBottom: `1px solid ${THEME.colors.ghost}`, 
        position: 'relative' 
      }}>
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ color: THEME.colors.ghost, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.ui }}>No image</div>
        )}
        
        {/* Hover overlay */}
        {isHovered && (
          <div
            style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'rgba(0,0,0,0.5)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px' 
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={e => { e.stopPropagation(); router.push(`/admin/products/${product.id}`); }}
              style={{ ...css.ghostBtn, fontSize: THEME.fontSizes.xs }}
            >
              Edit
            </button>
            <button
              onClick={e => { e.stopPropagation(); onRemove(product.id); }}
              style={{ ...css.dangerBtn, fontSize: THEME.fontSizes.xs }}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '12px' }}>
        {/* Fabric chip */}
        <span style={{ 
          display: 'inline-block', 
          background: 'rgba(201,169,110,0.08)', 
          color: THEME.colors.linen, 
          fontSize: THEME.fontSizes.xs, 
          padding: '2px 7px', 
          borderRadius: THEME.radius.sm, 
          marginBottom: '6px', 
          fontFamily: THEME.fonts.ui 
        }}>
          {product.fabricType} · {product.gsmWeight} GSM
        </span>

        {/* Name */}
        <div style={{ 
          fontSize: THEME.fontSizes.base, 
          color: THEME.colors.ivory, 
          fontFamily: THEME.fonts.ui, 
          marginBottom: '4px', 
          lineHeight: 1.3 
        }}>
          {product.name}
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <div>
            <div style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash, fontFamily: THEME.fonts.ui }}>{priceRange}</div>
            <div style={{ fontSize: THEME.fontSizes.xs, color: THEME.colors.muted, fontFamily: THEME.fonts.ui, marginTop: '2px' }}>{product.variants.length} variants</div>
          </div>
          <StockBadge product={product} />
        </div>
      </div>
    </div>
  );
}
