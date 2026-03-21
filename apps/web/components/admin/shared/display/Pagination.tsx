'use client';

import React from 'react';
import { THEME } from '@/lib/admin/theme';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${THEME.spacing.md} ${THEME.spacing.lg}`,
        borderTop: `1px solid ${THEME.colors.border}`,
        backgroundColor: THEME.colors.surface,
      }}
    >
      <div style={{ fontSize: THEME.fontSizes.sm, color: THEME.colors.ash }}>
        Showing <strong>{startItem}-{endItem}</strong> of <strong>{totalItems}</strong> results
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: THEME.spacing.xs }}>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            padding: `${THEME.spacing.xs} ${THEME.spacing.sm}`,
            border: `1px solid ${THEME.colors.border}`,
            borderRadius: THEME.radius.sm,
            backgroundColor: currentPage <= 1 ? THEME.colors.ghost : THEME.colors.surface2,
            color: currentPage <= 1 ? THEME.colors.muted : THEME.colors.ivory,
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            fontSize: THEME.fontSizes.sm,
            opacity: currentPage <= 1 ? 0.5 : 1,
          }}
        >
          Previous
        </button>

        {getPageNumbers().map((page, idx) => (
          page === '...' ? (
            <span
              key={`ellipsis-${idx}`}
              style={{
                padding: `${THEME.spacing.xs} ${THEME.spacing.xs}`,
                color: THEME.colors.muted,
              }}
            >
              ...
            </span>
          ) : (
            <button
              type="button"
              key={page}
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? 'page' : undefined}
              style={{
                minWidth: '32px',
                padding: `${THEME.spacing.xs} ${THEME.spacing.xs}`,
                border: `1px solid ${page === currentPage ? THEME.colors.linen : THEME.colors.border}`,
                borderRadius: THEME.radius.sm,
                backgroundColor: page === currentPage ? THEME.colors.linen : THEME.colors.surface2,
                color: page === currentPage ? '#000' : THEME.colors.ivory,
                cursor: 'pointer',
                fontSize: THEME.fontSizes.sm,
                fontWeight: page === currentPage ? 600 : 400,
              }}
            >
              {page}
            </button>
          )
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            padding: `${THEME.spacing.xs} ${THEME.spacing.sm}`,
            border: `1px solid ${THEME.colors.border}`,
            borderRadius: THEME.radius.sm,
            backgroundColor: currentPage >= totalPages ? THEME.colors.ghost : THEME.colors.surface2,
            color: currentPage >= totalPages ? THEME.colors.muted : THEME.colors.ivory,
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            fontSize: THEME.fontSizes.sm,
            opacity: currentPage >= totalPages ? 0.5 : 1,
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
