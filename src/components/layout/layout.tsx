'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: LayoutProps) {
  const { status } = useSession();
  const pathname = usePathname();
  
  // Check if current page is an auth page
  const isAuthPage = pathname?.startsWith('/auth');
  
  // Don't show sidebar on auth pages or when not authenticated
  if (isAuthPage || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }
  
  // Show sidebar for authenticated users on non-auth pages
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <SessionProvider>
      <LayoutContent>{children}</LayoutContent>
    </SessionProvider>
  );
}
