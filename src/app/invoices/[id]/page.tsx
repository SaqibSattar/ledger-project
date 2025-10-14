'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText, Printer, CreditCard, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';

interface InvoiceItem {
  productId: string;
  nameSnapshot: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerId: {
    _id: string;
    name: string;
    area: string;
  };
  items: InvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  invoiceDate: string;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
}

export default function ViewInvoicePage() {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      const data = await response.json();
      
      if (response.ok) {
        setInvoice(data);
      } else {
        console.error('Error fetching invoice:', data.error);
        router.push('/invoices');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      router.push('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoice || paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (paymentAmount > invoice.dueAmount) {
      alert('Payment amount cannot exceed the due amount');
      return;
    }

    setPaymentLoading(true);

    try {
      // First, create a Payment record
      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoiceId,
          amount: paymentAmount,
          paymentDate: new Date(paymentDate),
        }),
      });

      if (!paymentResponse.ok) {
        const data = await paymentResponse.json();
        alert('Error creating payment record: ' + data.error);
        return;
      }

      // Then, update the invoice
      const invoiceResponse = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paidAmount: invoice.paidAmount + paymentAmount,
          dueAmount: invoice.dueAmount - paymentAmount,
        }),
      });

      if (invoiceResponse.ok) {
        // Refresh the invoice data
        await fetchInvoice();
        setShowPaymentModal(false);
        setPaymentAmount(0);
        alert('Payment recorded successfully!');
      } else {
        const data = await invoiceResponse.json();
        alert('Error updating invoice: ' + data.error);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice Details</h1>
            <p className="text-gray-600">Loading invoice...</p>
          </div>
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice Not Found</h1>
            <p className="text-gray-600">The invoice you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice #{invoice.invoiceNumber}</h1>
            <p className="text-gray-600">Invoice details and breakdown</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Invoice Number</h4>
                  <p className="text-gray-600">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Invoice Date</h4>
                  <p className="text-gray-600">{formatDate(invoice.invoiceDate)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Customer</h4>
                <div className="text-gray-600">
                  <div className="font-medium">{invoice.customerId.name}</div>
                  <div>{invoice.customerId.area}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Created By</h4>
                <p className="text-gray-600">{invoice.createdBy.name}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.nameSnapshot}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.rate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paid Amount:</span>
                <span className="font-medium text-green-600">{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Due Amount:</span>
                <span className={`font-medium ${invoice.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(invoice.dueAmount)}
                </span>
              </div>
              
              <div className="pt-4">
                <div className={`px-3 py-2 rounded-full text-center text-sm font-medium ${
                  invoice.dueAmount === 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {invoice.dueAmount === 0 ? 'Fully Paid' : 'Payment Pending'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowPaymentModal(true)}
                disabled={invoice.dueAmount === 0}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
              <Button variant="outline" className="w-full">
                Send to Customer
              </Button>
              <Button variant="outline" className="w-full">
                Duplicate Invoice
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Record Payment</h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                Record a payment for Invoice #{invoice.invoiceNumber}
              </p>

              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <Label htmlFor="paymentAmount">Payment Amount *</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    min="0.01"
                    max={invoice.dueAmount}
                    step="0.01"
                    value={paymentAmount === 0 ? '' : paymentAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Remove leading zeros and convert to number
                      const numericValue = value === '' ? 0 : parseFloat(value.replace(/^0+/, '') || '0');
                      // Ensure no negative values
                      const finalValue = Math.max(0, numericValue);
                      setPaymentAmount(finalValue);
                    }}
                    onFocus={(e) => {
                      // Clear the field when user starts typing if it's 0
                      if (paymentAmount === 0) {
                        e.target.value = '';
                        setPaymentAmount(0);
                      }
                    }}
                    placeholder="Enter payment amount"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: {formatCurrency(invoice.dueAmount)}
                  </p>
                  {paymentAmount > invoice.dueAmount && (
                    <p className="text-xs text-red-500 mt-1">
                      Payment amount cannot exceed the due amount
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Payment Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Due:</span>
                      <span>{formatCurrency(invoice.dueAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Amount:</span>
                      <span className={paymentAmount > invoice.dueAmount ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(paymentAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-medium">
                      <span>Remaining Due:</span>
                      <span className={
                        Math.max(0, invoice.dueAmount - paymentAmount) === 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }>
                        {formatCurrency(Math.max(0, invoice.dueAmount - paymentAmount))}
                      </span>
                    </div>
                    {paymentAmount > invoice.dueAmount && (
                      <div className="text-xs text-red-500 mt-2 p-2 bg-red-50 rounded">
                        ⚠️ Payment amount exceeds due amount. Please adjust.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={paymentLoading || paymentAmount <= 0 || paymentAmount > invoice.dueAmount}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {paymentLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Record Payment
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
