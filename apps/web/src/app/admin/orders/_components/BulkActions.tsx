'use client';

import React from 'react';
import { THEME } from '@/lib/admin/theme';
import { ActionButton } from '@/components/admin/shared';

interface BulkActionsProps {
  selectedCount: number;
  onBulkShiprocket: () => void;
  onClearSelection: () => void;
  loading: boolean;
}

export function BulkActions({ 
  selectedCount, 
  onBulkShiprocket, 
  onClearSelection, 
  loading 
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div style={{ 
      background: 'rgba(201,169,110,0.06)', 
      border: `1px solid rgba(201,169,110,0.15)`, 
      borderRadius: THEME.radius.md, 
      padding: '8px 14px', 
      marginBottom: '10px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px' 
    }}>
      <span style={{ 
        fontSize: THEME.fontSizes.sm, 
        color: THEME.colors.linen, 
        fontFamily: THEME.fonts.ui 
      }}>
        {selectedCount} selected
      </span>
      <ActionButton onClick={onBulkShiprocket} loading={loading}>
        Push to Shiprocket
      </ActionButton>
      <ActionButton variant="ghost" onClick={onClearSelection}>
        Clear selection
      </ActionButton>
    </div>
  );
}
