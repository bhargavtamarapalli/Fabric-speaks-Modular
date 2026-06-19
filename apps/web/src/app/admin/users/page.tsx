'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PageHeader,
  ActionButton,
  ErrorBanner,
  ConfirmModal,
  useToast,
  FilterChip,
  SearchInput,
  Pagination,
} from '@/components/admin/shared';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useAuth } from '@/context/AuthContext';
import { useUsers } from './_hooks/useUsers';
import { useCustomerLookup } from './_hooks/useCustomerLookup';
import { useUsersForm } from './_hooks/useUsersForm';
import { UsersTable } from './_components/UsersTable';
import { UsersFormDrawer } from './_components/UsersFormDrawer';
import { CustomersTable } from './_components/CustomersTable';

type UsersTabId = 'all' | 'superAdmin' | 'inventoryManager' | 'supportAgent' | 'customers';

const ROLE_FILTERS: Record<Exclude<UsersTabId, 'all' | 'customers'>, string> = {
  superAdmin: 'superAdmin',
  inventoryManager: 'inventoryManager',
  supportAgent: 'supportAgent',
};

export default function UsersPage() {
  const { showToast, ToastComponent } = useToast();
  const { user: currentUser } = useAuth();
  const { activeRole } = useEffectiveRole();
  const isSuperAdmin = activeRole === 'SUPER_ADMIN';

  const [tab, setTab] = useState<UsersTabId>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const roleFilter = tab === 'all' || tab === 'customers' ? undefined : ROLE_FILTERS[tab];

  const canLoadStaff = isSuperAdmin && tab !== 'customers';

  const { users, meta, loading, error, load, deactivate } = useUsers({
    role: roleFilter,
    search: tab === 'customers' ? undefined : search.trim() || undefined,
    page,
    limit,
    enabled: canLoadStaff,
  });

  const { results: customers, loading: customersLoading, error: customersError, reload: reloadCustomers } = useCustomerLookup(
    tab === 'customers' ? search : ''
  );

  const {
    showForm,
    form,
    errors,
    saving,
    updateField,
    handleCreate,
    openForm,
    closeForm,
    deactId,
    setDeactId,
  } = useUsersForm({ onReload: load });

  const handleDeactivate = useCallback(async () => {
    if (!deactId) return;
    const result = await deactivate(deactId);
    if (result.success) {
      showToast('User deactivated', 'success');
      setDeactId(null);
    } else {
      showToast(result.error || 'Failed to deactivate user', 'error');
    }
  }, [deactId, deactivate, showToast, setDeactId]);

  const handleCreateUser = useCallback(async () => {
    const result = await handleCreate();
    if (result.success) {
      showToast('User created - invite sent', 'success');
    } else if (result.error) {
      showToast(result.error, 'error');
    }
  }, [handleCreate, showToast]);

  const tabs = useMemo(() => {
    if (activeRole === 'SUPER_ADMIN') {
      return [
        { id: 'all' as const, label: 'All Staff' },
        { id: 'superAdmin' as const, label: 'Super Admins' },
        { id: 'inventoryManager' as const, label: 'Inventory Managers' },
        { id: 'supportAgent' as const, label: 'Support Agents' },
        { id: 'customers' as const, label: 'Customers' },
      ];
    }
    return [
      { id: 'customers' as const, label: 'Customers' },
    ];
  }, [activeRole]);

  useEffect(() => {
    if (!isSuperAdmin && tab !== 'customers') {
      setTab('customers');
    }
  }, [isSuperAdmin, tab]);

  const totalLabel = tab === 'customers'
    ? `${customers.length} customers`
    : `${meta?.total ?? users.length} members`;

  return (
    <div>
      <PageHeader
        title={tab === 'customers' ? 'Customers' : 'Admin users'}
        subtitle={totalLabel}
        action={isSuperAdmin ? <ActionButton onClick={openForm}>+ Add user</ActionButton> : null}
      />

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {tabs.map((item) => (
          <FilterChip
            key={item.id}
            label={item.label}
            active={tab === item.id}
            onClick={() => {
              setTab(item.id);
              setPage(1);
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <SearchInput
          placeholder={tab === 'customers' ? 'Search customers (name, email, mobile)...' : 'Search staff (name, email, mobile)...'}
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
        />
      </div>

      {error && tab !== 'customers' && (
        <div style={{ marginBottom: '12px' }}>
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      {tab !== 'customers' ? (
        <>
          <UsersTable 
            users={users} 
            loading={loading} 
            onDeactivate={setDeactId} 
            currentUser={currentUser}
            currentUserRole={activeRole || 'SUPPORT_AGENT'}
          />

          <Pagination
            currentPage={meta?.page ?? page}
            totalPages={meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1}
            totalItems={meta?.total ?? users.length}
            itemsPerPage={meta?.limit ?? limit}
            onPageChange={setPage}
          />
        </>
      ) : (
        <>
          {customersError && (
            <div style={{ marginBottom: '12px' }}>
              <ErrorBanner message={customersError} onRetry={reloadCustomers} />
            </div>
          )}
          <CustomersTable customers={customers} loading={customersLoading} query={search} />
        </>
      )}

      <UsersFormDrawer
        open={showForm}
        form={form}
        errors={errors}
        saving={saving}
        onClose={closeForm}
        onUpdateField={updateField}
        onSubmit={handleCreateUser}
      />

      <ConfirmModal
        open={!!deactId}
        title="Deactivate user?"
        message="This user will lose access immediately. Their audit log history is preserved."
        onConfirm={handleDeactivate}
        onCancel={() => setDeactId(null)}
        confirmLabel="Deactivate"
        danger
      />

      {ToastComponent}
    </div>
  );
}
