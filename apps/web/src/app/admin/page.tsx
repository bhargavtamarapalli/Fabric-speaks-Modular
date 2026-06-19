'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { THEME } from '@/lib/admin/theme';

/**
 * Admin root page - redirects to dashboard
 * This is the landing page for /admin
 */
export default function AdminPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to dashboard by default
        router.replace('/admin/dashboard');
    }, [router]);

    return (
        <div style={{
          display: 'flex',
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '100vh',
          background: THEME.colors.bg,
          padding: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <SpiderLoader size="lg" />
            <p style={{
              marginTop: '16px',
              color: THEME.colors.muted,
              fontFamily: THEME.fonts.ui
            }}>Loading admin...</p>
          </div>
        </div>
    );
}
