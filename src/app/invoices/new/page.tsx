'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

interface Customer {
  _id: string;
  name: string;
  area: string;
}

interface Product {
  _id: string;
  name: string;
  unitPrice: number;
  stockQuantity?: number;
  unit: string;
}

interface InvoiceItem {
  productId: string;
  nameSnapshot: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function NewInvoicePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
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

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      if (response.ok) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addItem = () => {
    setItems([...items, {
      productId: '',
      nameSnapshot: '',
      quantity: 1,
      rate: 0,
      amount: 0,
    }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'productId') {
      const product = products.find(p => p._id === value);
      if (product) {
        newItems[index].nameSnapshot = product.name;
        newItems[index].rate = product.unitPrice;
        newItems[index].amount = newItems[index].quantity * product.unitPrice;
      }
    } else if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const dueAmount = Math.max(0, totalAmount - paidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer || items.length === 0) {
      alert('Please select a customer and add at least one item');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: selectedCustomer,
          items: items.map(item => ({
            ...item,
            productId: item.productId,
          })),
          totalAmount,
          paidAmount,
          dueAmount,
          invoiceDate: new Date(invoiceDate),
        }),
      });

      if (response.ok) {
        router.push('/invoices');
      } else {
        const data = await response.json();
        alert('Error creating invoice: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice');
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Create New Invoice</h1>
          <p className="text-gray-600">Generate a new invoice for a customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Select customer and invoice date</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customer">Customer *</Label>
              <Select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name} - {customer.area}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="paidAmount">Amount Paid (Optional)</Label>
              <Input
                id="paidAmount"
                type="number"
                min="0"
                max={totalAmount}
                step="0.01"
                value={paidAmount === 0 ? '' : paidAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Remove leading zeros and convert to number
                  const numericValue = value === '' ? 0 : parseFloat(value.replace(/^0+/, '') || '0');
                  // Ensure no negative values and not greater than total
                  const finalValue = Math.max(0, Math.min(numericValue, totalAmount));
                  setPaidAmount(finalValue);
                }}
                onFocus={(e) => {
                  // Clear the field when user starts typing if it's 0
                  if (paidAmount === 0) {
                    e.target.value = '';
                    setPaidAmount(0);
                  }
                }}
                placeholder="Enter amount paid by customer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty if no payment received yet
              </p>
              {paidAmount > totalAmount && (
                <p className="text-xs text-red-500 mt-1">
                  Paid amount cannot exceed total amount
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Invoice Items</CardTitle>
                <CardDescription>Add products to the invoice</CardDescription>
              </div>
              <Button type="button" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items added yet. Click "Add Item" to start.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={item.productId}
                          onChange={(e) => updateItem(index, 'productId', e.target.value)}
                        >
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.name} ({product.unitPrice} PKR/{product.unit})
                            </option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={item.rate}
                          onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-lg font-medium">
                  Total Amount: {formatCurrency(totalAmount)}
                </div>
              </div>
              
              {paidAmount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className={paidAmount > totalAmount ? 'text-red-600' : 'text-green-600'} font-medium>
                    {formatCurrency(paidAmount)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-lg font-semibold border-t pt-4">
                <span>Amount Due:</span>
                <span className={dueAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(dueAmount)}
                </span>
              </div>
              
              {paidAmount > totalAmount && (
                <div className="text-center text-red-600 text-sm font-medium bg-red-50 p-2 rounded">
                  ⚠️ Paid amount exceeds total amount
                </div>
              )}
              
              {dueAmount === 0 && paidAmount > 0 && paidAmount <= totalAmount && (
                <div className="text-center text-green-600 text-sm font-medium">
                  ✓ Invoice Fully Paid
                </div>
              )}
            </div>
            
            <div className="flex gap-4 mt-6">
              <Link href="/invoices">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading || items.length === 0}>
                {isLoading ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
