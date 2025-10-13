'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, FileText, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session } = useSession();

  const stats = [
    {
      title: 'Total Customers',
      value: '0',
      description: 'Active customers',
      icon: Users,
      href: '/customers',
    },
    {
      title: 'Total Products',
      value: '0',
      description: 'Products in inventory',
      icon: Package,
      href: '/products',
    },
    {
      title: 'Total Invoices',
      value: '0',
      description: 'Invoices generated',
      icon: FileText,
      href: '/invoices',
    },
    {
      title: 'Ledger Reports',
      value: '0',
      description: 'Customer ledgers',
      icon: BookOpen,
      href: '/ledger',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {session?.user?.name}! Here's an overview of your ledger system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>
              Latest invoices created in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              No invoices found. Create your first invoice to get started.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks you can perform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/customers/new">
              <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <h4 className="font-medium">Add New Customer</h4>
                <p className="text-sm text-gray-600">Create a new customer profile</p>
              </div>
            </Link>
            <Link href="/products/new">
              <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <h4 className="font-medium">Add New Product</h4>
                <p className="text-sm text-gray-600">Add a product to inventory</p>
              </div>
            </Link>
            <Link href="/invoices/new">
              <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <h4 className="font-medium">Create Invoice</h4>
                <p className="text-sm text-gray-600">Generate a new invoice</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
