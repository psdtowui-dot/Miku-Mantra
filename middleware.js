import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'mikumantra_session';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect administrative dashboard and management routes at the edge
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (!sessionCookie) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();

  // Inject defense-in-depth security headers at the edge
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match admin routes and internal operations
     */
    '/admin/:path*',
  ],
};
