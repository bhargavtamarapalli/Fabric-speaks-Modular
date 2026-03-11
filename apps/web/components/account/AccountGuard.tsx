'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';

export const AccountGuard = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/account');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex w-full min-h-[50vh] items-center justify-center bg-[var(--fs-void)]">
        <SpiderLoader size="lg" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return <>{children}</>;
};
