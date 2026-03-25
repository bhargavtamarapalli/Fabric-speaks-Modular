import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Verify JWT signature using Web Crypto API (Edge-compatible)
 */
async function verifyJwt(token: string, secret: string): Promise<boolean> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    
    // Convert base64url to Uint8Array
    const signature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/').padEnd(signatureB64.length + (4 - signatureB64.length % 4) % 4, '=')),
      c => c.charCodeAt(0)
    );

    return await crypto.subtle.verify('HMAC', key, signature, data);
  } catch (err) {
    console.error('[Middleware] JWT verification failed:', err);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin/* routes
  if (pathname.startsWith('/admin')) {
    const token =
      request.cookies.get('jwt')?.value
      ?? request.cookies.get('__session')?.value
      ?? request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Cryptographic verification of the JWT signature
    // Only enforce in production. In local dev, the API layer handles verification.
    const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production';
    if (!isProduction) {
      return NextResponse.next();
    }

    const secret = process.env.APP_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.next();
    }

    const isValid = await verifyJwt(token, secret);

    if (!isValid) {
      console.warn(`[Middleware] Signature verification FAILED for ${pathname}. Redirecting to login.`);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'SESSION_INVALID');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
