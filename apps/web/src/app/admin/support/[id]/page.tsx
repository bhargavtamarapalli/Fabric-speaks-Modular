'use client';

// app/admin/support/[id]/page.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supportApi } from '@/lib/admin/api';
import { useAdminAuth } from '@/context/AdminAuthContext';
import type { SupportCase, CaseStatus } from '@/lib/admin/types';
import { THEME } from '@/lib/admin/theme';
import {
  PageHeader,
  SectionCard,
  Badge,
  ActionButton,
  ErrorBanner,
  Loader,
  FormField,
  Textarea,
  useToast,
} from '@/components/admin/shared';
import { mapError } from '@/lib/admin/errors';

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'open',
  IN_PROGRESS: 'inprogress',
  RESOLVED: 'resolved',
  ESCALATED: 'warning',
};

const NOTE_INITIAL = { note: '' };

export default function SupportDetailPage() {
  // ===== ALL HOOKS MUST BE AT THE TOP, BEFORE ANY CONDITIONAL LOGIC =====

  const router = useRouter();
  const { role, loading: authLoading } = useAdminAuth();
  const params = useParams();
  const { showToast, ToastComponent } = useToast();

  const caseId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [supportCase, setSupportCase] = useState<SupportCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<CaseStatus>('OPEN');
  const [statusSaving, setStatusSaving] = useState(false);

  const [noteForm, setNoteForm] = useState(NOTE_INITIAL);
  const [noteError, setNoteError] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const load = useCallback(async () => {
    if (!caseId) return;
    try {
      setError(null);
      setLoading(true);
      const res = await supportApi.getById(caseId);
      setSupportCase(res);
      setStatus(res.status);
    } catch (e: any) {
      setError(mapError(e));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  // ===== NOW SAFE TO DO CONDITIONAL LOGIC =====

  // Role gate: SUPER_ADMIN and SUPPORT_AGENT can view support cases
  const isAuthorized = role === 'SUPER_ADMIN' || role === 'SUPPORT_AGENT';

  if (authLoading) {
    return <Loader />;
  }

  if (!isAuthorized) {
    return (
      <div style={{ padding: THEME.spacing.lg, textAlign: 'center' }}>
        <p style={{ color: THEME.colors.error, fontFamily: THEME.fonts.ui }}>
          You do not have permission to view this support case.
        </p>
        <ActionButton onClick={() => router.push('/admin/dashboard')} style={{ marginTop: THEME.spacing.md }}>
          Back to Dashboard
        </ActionButton>
      </div>
    );
  }

  const handleStatusUpdate = async () => {
    if (!supportCase) return;
    try {
      setStatusSaving(true);
      await supportApi.updateStatus(supportCase.id, status);
      showToast('Status updated', 'success');
      load();
    } catch (e: any) {
      showToast(mapError(e), 'error');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!supportCase) return;
    const note = noteForm.note.trim();
    if (!note) {
      setNoteError('Note is required');
      return;
    }
    try {
      setNoteSaving(true);
      await supportApi.addNote(supportCase.id, note);
      setNoteForm(NOTE_INITIAL);
      setNoteError('');
      showToast('Note added', 'success');
      load();
    } catch (e: any) {
      showToast(mapError(e), 'error');
    } finally {
      setNoteSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!supportCase) return <ErrorBanner message="Support case not found" onRetry={load} />;

  return (
    <div>
      <PageHeader
        title={`Support Case ${supportCase.id}`}
        subtitle={`Created ${new Date(supportCase.createdAt).toLocaleString('en-IN')}`}
        action={<ActionButton variant="ghost" onClick={() => router.push('/admin/support')}>Back to Support</ActionButton>}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: THEME.spacing.lg,
        alignItems: 'start',
      }}>
        <div>
          <SectionCard title="Case Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.sm }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: THEME.colors.ash }}>Status</span>
                <Badge type={(STATUS_BADGE[supportCase.status] ?? 'draft') as any}>{supportCase.status.replace('_', ' ')}</Badge>
              </div>
              <div style={{ color: THEME.colors.ivory }}>{supportCase.issueType}</div>
              <div style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.sm }}>
                Priority: {supportCase.priority}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Notes">
            {supportCase.notes.length === 0 ? (
              <div style={{ color: THEME.colors.ash, fontSize: THEME.fontSizes.base }}>No notes yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.sm }}>
                {supportCase.notes.map(note => (
                  <div key={note.id} style={{ borderBottom: `1px solid ${THEME.colors.border}`, paddingBottom: THEME.spacing.sm }}>
                    <div style={{ color: THEME.colors.ivory, fontSize: THEME.fontSizes.base }}>{note.note}</div>
                    <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs }}>
                      {note.agentName} · {new Date(note.createdAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Customer">
            <div style={{ color: THEME.colors.ivory }}>{supportCase.customer.name}</div>
            <div style={{ color: THEME.colors.muted, fontSize: THEME.fontSizes.xs, fontFamily: THEME.fonts.mono }}>{supportCase.customer.mobile}</div>
          </SectionCard>

          <SectionCard title="Update Status">
            <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.sm }}>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as CaseStatus)}
                style={{
                  background: THEME.colors.bg,
                  border: `1px solid ${THEME.colors.border2}`,
                  borderRadius: THEME.radius.md,
                  color: THEME.colors.ivory,
                  padding: THEME.spacing.sm,
                  fontSize: THEME.fontSizes.base,
                }}
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="ESCALATED">ESCALATED</option>
              </select>
              <ActionButton onClick={handleStatusUpdate} loading={statusSaving}>Update Status</ActionButton>
            </div>
          </SectionCard>

          <SectionCard title="Add Note">
            <div style={{ display: 'flex', flexDirection: 'column', gap: THEME.spacing.sm }}>
              <FormField label="Note" required error={noteError}>
                <Textarea
                  value={noteForm.note}
                  onChange={e => {
                    setNoteForm({ note: e.target.value });
                    if (noteError) setNoteError('');
                  }}
                  placeholder="Add internal note..."
                />
              </FormField>
              <ActionButton onClick={handleAddNote} loading={noteSaving}>Add Note</ActionButton>
            </div>
          </SectionCard>
        </div>
      </div>

      {ToastComponent}
    </div>
  );
}
