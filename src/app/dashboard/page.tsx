'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, FileText, BookOpen, UserCog, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  totalInvoices: number;
  totalUsers: number;
  totalLedgerEntries: number;
  totalInvoiceAmount: number;
  totalPaidAmount: number;
  totalDueAmount: number;
  recentInvoices: Array<{
    _id: string;
    invoiceNumber: string;
    totalAmount: number;
    invoiceDate: string;
    customerId: { name: string };
    createdBy: { name: string };
  }>;
  lowStockProducts: Array<{
    _id: string;
    name: string;
    stockQuantity: number;
    minStockAlert: number;
    unit: string;
  }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statCards = [
    {
      title: 'Total Customers',
      value: stats?.totalCustomers?.toString() || '0',
      description: 'Active customers',
      icon: Users,
      href: '/customers',
    },
    {
      title: 'Total Products',
      value: stats?.totalProducts?.toString() || '0',
      description: 'Products in inventory',
      icon: Package,
      href: '/products',
    },
    {
      title: 'Total Invoices',
      value: stats?.totalInvoices?.toString() || '0',
      description: 'Invoices generated',
      icon: FileText,
      href: '/invoices',
    },
    {
      title: 'Ledger Reports',
      value: stats?.totalLedgerEntries?.toString() || '0',
      description: 'Customer ledgers',
      icon: BookOpen,
      href: '/ledger',
    },
    ...(session?.user?.role === 'admin' ? [{
      title: 'System Users',
      value: stats?.totalUsers?.toString() || '0',
      description: 'Manage users',
      icon: UserCog,
      href: '/users',
    }] : []),
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-red-600">Error loading dashboard: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {session?.user?.name}! Here's an overview of your ledger system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
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

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.totalInvoiceAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From all invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Collected</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats?.totalPaidAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Payments received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats?.totalDueAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending payments
            </p>
          </CardContent>
        </Card>
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
            {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {stats.recentInvoices.map((invoice) => (
                  <div key={invoice._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">#{invoice.invoiceNumber}</p>
                      <p className="text-sm text-gray-600">{invoice.customerId.name}</p>
                      <p className="text-xs text-gray-500">
                        Created by {invoice.createdBy.name} • {formatDate(invoice.invoiceDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
                    </div>
                  </div>
                ))}
                <Link href="/invoices" className="block text-center text-blue-600 hover:text-blue-800">
                  View all invoices →
                </Link>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No invoices found. Create your first invoice to get started.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Products</CardTitle>
            <CardDescription>
              Products that need restocking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {stats.lowStockProducts.map((product) => (
                  <div key={product._id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        Current: {product.stockQuantity} {product.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-red-600 font-medium">
                        Min: {product.minStockAlert} {product.unit}
                      </p>
                    </div>
                  </div>
                ))}
                <Link href="/products" className="block text-center text-blue-600 hover:text-blue-800">
                  Manage products →
                </Link>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                All products are well stocked! 🎉
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
  );
}
