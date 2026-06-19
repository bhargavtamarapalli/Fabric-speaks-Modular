'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, type AdminRole, type PromoteUserResponse } from '@/lib/admin/authApi';
import { useToast } from '@/context/ToastContext';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

const ROLES = [
  { value: 'superAdmin' as AdminRole, label: 'Super Admin', color: '#e5c97e' },
  { value: 'inventoryManager' as AdminRole, label: 'Inventory Manager', color: '#7ec9e5' },
  { value: 'supportAgent' as AdminRole, label: 'Support Agent', color: '#7ee5b4' },
  { value: 'customer' as AdminRole, label: 'Customer', color: '#9b9b9b' },
];

interface PromoteResult extends PromoteUserResponse {}

export default function PromoteUserPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('superAdmin');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PromoteResult | null>(null);
  const { showToast } = useToast();

  // Development-only page — must be disabled in production
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ marginBottom: '20px', color: '#e5c97e', fontSize: '14px' }}>
          ⚠️ This tool is only available in development
        </div>
        <button
          onClick={() => router.push('/admin/dashboard')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#7ec9e5',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await authApi.promoteUser({
        email: email.trim(),
        role: role as AdminRole,
      });
      setResult(data);
      showToast(`✓ ${email} is now ${role}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update role', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      {/* Dev badge */}
      <div className="flex items-center gap-2 mb-8 px-3 py-2 bg-amber-900/20 border border-amber-600/40 rounded text-amber-400 text-xs font-mono uppercase tracking-widest">
        <AlertTriangle size={14} />
        Development Only — Disabled in Production
      </div>

      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="text-[var(--fs-linen)]" size={28} />
        <div>
          <h1 className="text-2xl font-serif text-[var(--fs-ivory)]">User Role Manager</h1>
          <p className="text-sm text-[var(--fs-ash)]">Assign or change a user&apos;s role by email</p>
        </div>
      </div>

      <form onSubmit={handlePromote} className="space-y-6">
        <div>
          <label htmlFor="promote-email" className="block text-xs font-mono uppercase tracking-widest text-[var(--fs-ash)] mb-2">
            User Email
          </label>
          <input
            id="promote-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full bg-[var(--fs-surface-2)] border border-[var(--fs-wire)] text-[var(--fs-ivory)] px-4 py-3 font-mono text-sm outline-none focus:border-[var(--fs-linen)] transition-colors"
          />
        </div>

        <div>
          <label htmlFor="promote-role" className="block text-xs font-mono uppercase tracking-widest text-[var(--fs-ash)] mb-2">
            Assign Role
          </label>
          <div id="promote-role" className="grid grid-cols-2 gap-3">
            {ROLES.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`px-4 py-3 border text-sm font-mono text-left transition-all ${
                  role === r.value
                    ? 'border-[var(--fs-linen)] text-[var(--fs-linen)] bg-[var(--fs-linen)]/5'
                    : 'border-[var(--fs-wire)] text-[var(--fs-ash)] hover:border-[var(--fs-ash)]'
                }`}
              >
                <span className="w-2 h-2 rounded-full inline-block mr-2" style={{ backgroundColor: r.color }} />
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full py-3 bg-[var(--fs-linen)] text-[var(--fs-void)] font-sans text-sm uppercase tracking-widest font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Updating…' : `Set as ${ROLES.find(r => r.value === role)?.label}`}
        </button>
      </form>

      {result && (
        <div className="mt-8 p-4 border border-[var(--fs-wire)] bg-[var(--fs-surface-2)]">
          <p className="text-xs font-mono text-[var(--fs-ash)] mb-3 uppercase tracking-widest">Updated User</p>
          <div className="space-y-1 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--fs-ash)]">ID</span>
              <span className="text-[var(--fs-ivory)] truncate ml-4">{result.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--fs-ash)]">Name</span>
              <span className="text-[var(--fs-ivory)]">{result.name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--fs-ash)]">Email</span>
              <span className="text-[var(--fs-ivory)]">{result.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--fs-ash)]">Role</span>
              <span className="text-[var(--fs-linen)] font-semibold">{result.role}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
