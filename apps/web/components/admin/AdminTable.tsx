'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Download, Search } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
}

interface AdminTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onExportCsv?: () => void;
  exportFilename?: string;
  searchPlaceholder?: string;
  globalSearchField?: keyof T;
}

export function AdminTable<T extends Record<string, unknown>>({
  data,
  columns,
  onExportCsv,
  exportFilename = 'export.csv',
  searchPlaceholder = 'Search...',
  globalSearchField
}: AdminTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchPath, setSearchPath] = useState('');

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const processedData = [...data]
    .filter(row => {
      if (!searchPath || !globalSearchField) return true;
      const val = row[globalSearchField];
      return String(val).toLowerCase().includes(searchPath.toLowerCase());
    })
    .sort((a, b) => {
      if (!sortKey) return 0;
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const generateCsv = () => {
    if (onExportCsv) return onExportCsv();
    const headers = columns.map(c => c.header).join(',');
    const rows = processedData.map(row => 
      columns.map(c => {
        const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');
    
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            className="w-full bg-[var(--fs-void)] border border-gray-700 rounded-md py-2 pl-10 pr-4 text-sm text-[var(--fs-linen)] focus:outline-none focus:border-gray-500"
            placeholder={searchPlaceholder}
            value={searchPath}
            onChange={(e) => setSearchPath(e.target.value)}
          />
        </div>
        <button 
          onClick={generateCsv}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-sm py-2 px-4 rounded transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-800 rounded-lg">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-xs uppercase bg-gray-900 text-gray-400">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="px-6 py-4 font-medium whitespace-nowrap">
                  {col.sortable && typeof col.accessor !== 'function' ? (
                    <button 
                      onClick={() => handleSort(col.accessor as keyof T)}
                      className="flex items-center gap-1 hover:text-white"
                    >
                      {col.header}
                      {sortKey === col.accessor ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : <div className="w-3 h-3" />}
                    </button>
                  ) : (
                    <span>{col.header}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                  No records found.
                </td>
              </tr>
            ) : (
              processedData.map((row, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  {columns.map((col, j) => (
                    <td key={j} className="px-6 py-4">
                      {typeof col.accessor === 'function' ? col.accessor(row) : (row[col.accessor] as any)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
