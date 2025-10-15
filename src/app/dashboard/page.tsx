'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Users, Package, FileText, BookOpen, UserCog, AlertTriangle, TrendingUp, DollarSign, Clock, CheckCircle } from 'lucide-react';
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

interface SalesAnalytics {
  period: string;
  totalSales: number;
  paidAmount: number;
  pendingAmount: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  averageInvoiceValue: number;
  topProducts: Array<{
    productName: string;
    quantity: number;
    totalAmount: number;
  }>;
  recentInvoices: Array<{
    invoiceNumber: string;
    customerName: string;
    amount: number;
    status: 'paid' | 'pending';
    date: string;
  }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('today');

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

  useEffect(() => {
    const fetchSalesAnalytics = async () => {
      try {
        setSalesLoading(true);
        const response = await fetch(`/api/sales/analytics?period=${selectedPeriod}`);
        if (!response.ok) {
          throw new Error('Failed to fetch sales analytics');
        }
        const data = await response.json();
        setSalesAnalytics(data.analytics);
      } catch (err) {
        console.error('Error fetching sales analytics:', err);
      } finally {
        setSalesLoading(false);
      }
    };

    fetchSalesAnalytics();
  }, [selectedPeriod]);

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

      {/* Sales Analytics Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sales Analytics
              </CardTitle>
              <CardDescription>
                Track your sales performance across different time periods
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="6months">Last 6 Months</option>
                <option value="year">Last Year</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {salesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : salesAnalytics ? (
            <div className="space-y-6">
              {/* Sales Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Sales</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(salesAnalytics.totalSales)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {salesAnalytics.totalInvoices} invoices
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Paid Amount</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(salesAnalytics.paidAmount)}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {salesAnalytics.paidInvoices} paid invoices
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(salesAnalytics.pendingAmount)}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {salesAnalytics.pendingInvoices} pending invoices
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg. Invoice Value</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(salesAnalytics.averageInvoiceValue)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Per invoice
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Products and Recent Invoices */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Products</CardTitle>
                    <CardDescription>
                      Best selling products in the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {salesAnalytics.topProducts.length > 0 ? (
                      <div className="space-y-3">
                        {salesAnalytics.topProducts.map((product, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{product.productName}</p>
                              <p className="text-xs text-gray-600">
                                Qty: {product.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(product.totalAmount)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        No sales data for this period
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Sales</CardTitle>
                    <CardDescription>
                      Latest invoices in the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {salesAnalytics.recentInvoices.length > 0 ? (
                      <div className="space-y-3">
                        {salesAnalytics.recentInvoices.map((invoice, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-sm">#{invoice.invoiceNumber}</p>
                              <p className="text-xs text-gray-600">{invoice.customerName}</p>
                              <p className="text-xs text-gray-500">{formatDate(invoice.date)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                invoice.status === 'paid' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {invoice.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        No invoices for this period
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Failed to load sales analytics
            </div>
          )}
        </CardContent>
      </Card>

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
