import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected route prefixes that require authentication
const protectedRoutePrefixes = ['/invoicing','/dispatching', '/payroll'];
const authRoutes = ['/login'];

// Create regex pattern from protected route prefixes
const createProtectedRoutesRegex = (prefixes: string[]) => {
  const escapedPrefixes = prefixes.map(prefix => prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = `^(${escapedPrefixes.join('|')})(\/.*)?$`;
  return new RegExp(pattern);
};

const protectedRoutesRegex = createProtectedRoutesRegex(protectedRoutePrefixes);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get the token from cookies
  const token = request.cookies.get('authToken')?.value;
  const isAuthenticated = !!token;
  
  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutesRegex.test(pathname);
  
  // Check if the current path is an auth route (login)
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Redirect logic
  if (isProtectedRoute && !isAuthenticated) {
    // User is trying to access protected route without authentication
    const loginUrl = new URL('/login', request.url);
    // Add redirect parameter to return user to their intended destination after login
    loginUrl.searchParams.set('redirect', pathname);
    console.log(`Redirecting unauthenticated user from ${pathname} to login`);
    return NextResponse.redirect(loginUrl);
  }
  
  if (isAuthRoute && isAuthenticated) {
    // User is trying to access login page while already authenticated
    // Check if there's a redirect parameter
    const redirectUrl = request.nextUrl.searchParams.get('redirect');
    if (redirectUrl && protectedRoutesRegex.test(redirectUrl)) {
      console.log(`Redirecting authenticated user from login to ${redirectUrl}`);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    // Default redirect to dashboard
    console.log('Redirecting authenticated user from login to dashboard');
    return NextResponse.redirect(new URL('/invoicing', request.url));
  }
  
  // Log successful access to protected routes
  if (isProtectedRoute && isAuthenticated) {
    console.log(`Authenticated access to ${pathname}`);
  }
  
  // Allow the request to continue
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public|fonts|images).*)',
  ],
};
