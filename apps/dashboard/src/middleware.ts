import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { appHost, siteHost } from '@/lib/site';

const APP_ROUTE_PREFIXES = ['/login', '/register', '/dashboard', '/auth'];

export function middleware(request: NextRequest) {
  const marketingHost = siteHost();
  const dashboardHost = appHost();

  if (!marketingHost || !dashboardHost || marketingHost === dashboardHost) {
    return NextResponse.next();
  }

  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (host === dashboardHost && (pathname === '/' || pathname.startsWith('/blog'))) {
    const url = request.nextUrl.clone();
    url.hostname = marketingHost;
    url.port = '';
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  if (
    host === marketingHost &&
    APP_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    const url = request.nextUrl.clone();
    url.hostname = dashboardHost;
    url.port = '';
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
