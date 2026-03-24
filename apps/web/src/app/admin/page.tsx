'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading admin...</p>
            </div>
        </div>
    );
}
