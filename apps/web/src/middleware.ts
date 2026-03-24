import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin/* routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('__session')?.value
                  ?? request.headers.get('authorization')?.replace('Bearer ', '');

    // No token at all — redirect to login immediately
    // Note: Full JWT verification must happen in the API route or server component
    // Middleware only does a presence check for performance
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
