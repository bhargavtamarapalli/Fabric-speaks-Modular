'use client';

import React, { useCallback } from 'react';
import {
  PageHeader,
  ActionButton,
  ErrorBanner,
  ConfirmModal,
  useToast,
} from '@/components/admin/shared';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useAuth } from '@/context/AuthContext';
import { useUsers } from './_hooks/useUsers';
import { useUsersForm } from './_hooks/useUsersForm';
import { UsersTable } from './_components/UsersTable';
import { UsersFormDrawer } from './_components/UsersFormDrawer';

export default function UsersPage() {
  const { showToast, ToastComponent } = useToast();
  const { user: currentUser } = useAuth();
  const { activeRole } = useEffectiveRole();
  const isSuperAdmin = activeRole === 'SUPER_ADMIN';

  const { users, loading, error, load, deactivate } = useUsers();
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
      showToast('User created — invite sent', 'success');
    } else if (result.error) {
      showToast(result.error, 'error');
    }
  }, [handleCreate, showToast]);

  return (
    <div>
      <PageHeader
        title="Admin users"
        subtitle={`${users.length} members`}
        action={isSuperAdmin ? <ActionButton onClick={openForm}>+ Add user</ActionButton> : null}
      />

      {error && (
        <div style={{ marginBottom: '12px' }}>
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      <UsersTable 
        users={users} 
        loading={loading} 
        onDeactivate={setDeactId} 
        currentUser={currentUser}
        currentUserRole={activeRole || 'SUPPORT_AGENT'}
      />

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
