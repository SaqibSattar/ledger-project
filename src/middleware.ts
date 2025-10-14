import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth');

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return null;
    }

    if (!isAuth) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }

      return NextResponse.redirect(
        new URL(`/auth/signin?from=${encodeURIComponent(from)}`, req.url)
      );
    }

    // Role-based access control
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
    const isAccountantRoute = req.nextUrl.pathname.startsWith('/accountant');
    const isUsersRoute = req.nextUrl.pathname.startsWith('/users');

    if (isAdminRoute && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    if (isAccountantRoute && token?.role !== 'accountant') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    if (isUsersRoute && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/accountant/:path*',
    '/customers/:path*',
    '/products/:path*',
    '/invoices/:path*',
    '/ledger/:path*',
    '/users/:path*',
    '/api/customers/:path*',
    '/api/products/:path*',
    '/api/invoices/:path*',
    '/api/ledger/:path*',
    '/api/users/:path*',
    '/api/payments/:path*',
    '/api/dashboard/:path*',
  ],
};
