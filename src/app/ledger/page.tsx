'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, BookOpen } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Customer {
  _id: string;
  name: string;
  area: string;
}

interface LedgerEntry {
  date: string;
  description: string;
  invoiceNumber?: string;
  debit: number;
  credit: number;
  balance: number;
  customer: Customer;
  createdBy: {
    name: string;
    email: string;
  };
}

interface LedgerSummary {
  totalCredit: number;
  totalPaid: number;
  currentBalance: number;
  totalEntries: number;
}

export default function LedgerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    customerId: '',
    area: '',
    createdBy: '',
    fromDate: '',
    toDate: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      if (response.ok) {
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.customerId) params.append('customerId', filters.customerId);
      if (filters.area) params.append('area', filters.area);
      if (filters.createdBy) params.append('createdBy', filters.createdBy);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      
      const response = await fetch(`/api/ledger?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setEntries(data.entries);
        setSummary(data.summary);
      } else {
        console.error('Error fetching ledger:', data.error);
      }
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    fetchLedger();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Ledger</h1>
          <p className="text-gray-600">View customer account statements and running balances</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Ledger</CardTitle>
          <CardDescription>Select filters to generate customer ledger</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Customer</label>
              <Select
                value={filters.customerId}
                onChange={(e) => handleFilterChange('customerId', e.target.value)}
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name} - {customer.area}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Area</label>
              <Input
                placeholder="Filter by area..."
                value={filters.area}
                onChange={(e) => handleFilterChange('area', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Created By</label>
              <Input
                placeholder="Filter by user..."
                value={filters.createdBy}
                onChange={(e) => handleFilterChange('createdBy', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Generate Ledger
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Ledger Summary</CardTitle>
            <CardDescription>Account overview for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.totalCredit)}
                </div>
                <div className="text-sm text-gray-600">Total Credit</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalPaid)}
                </div>
                <div className="text-sm text-gray-600">Total Paid</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  summary.currentBalance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatCurrency(summary.currentBalance)}
                </div>
                <div className="text-sm text-gray-600">Current Balance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {summary.totalEntries}
                </div>
                <div className="text-sm text-gray-600">Total Entries</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${entries.length} entries found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Generating ledger...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No ledger entries found. Apply filters and click &quot;Generate Ledger&quot; to view entries.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>{entry.invoiceNumber || '-'}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{entry.customer.name}</div>
                        <div className="text-sm text-gray-500">{entry.customer.area}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={entry.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(entry.balance)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
