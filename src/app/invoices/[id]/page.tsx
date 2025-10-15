'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText, Printer, CreditCard, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

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
  const [exporting, setExporting] = useState(false);
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const fetchInvoice = useCallback(async () => {
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
  }, [invoiceId, router]);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId, fetchInvoice]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoice || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (paymentAmount > invoice.dueAmount) {
      toast.error('Payment amount cannot exceed the due amount');
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
        toast.error('Error creating payment record: ' + data.error);
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
        toast.success('Payment recorded successfully!');
      } else {
        const data = await invoiceResponse.json();
        toast.error('Error updating invoice: ' + data.error);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Error recording payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!invoice) return;

    try {
      setExporting(true);
      // Import jsPDF dynamically
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      
      // Get the invoice content (excluding buttons and navigation)
      const invoiceContent = document.querySelector('.invoice-content');
      if (!invoiceContent) {
        toast.error('No invoice data to export');
        return;
      }

      // Clone the element to avoid modifying the original
      const clonedContent = invoiceContent.cloneNode(true) as HTMLElement;
      
      // Show the content for PDF generation (it's hidden on the page)
      clonedContent.style.display = 'block';
      clonedContent.style.position = 'absolute';
      clonedContent.style.left = '-9999px';
      clonedContent.style.top = '0';
      document.body.appendChild(clonedContent);

      // Override any LAB colors with standard colors for exact image match
      const style = document.createElement('style');
      style.textContent = `
        * {
          color: rgb(0, 0, 0) !important;
          background-color: rgb(255, 255, 255) !important;
          border-color: rgb(0, 0, 0) !important;
          font-family: Arial, sans-serif !important;
        }
        
        /* Improved PDF styling */
        body {
          font-family: Arial, sans-serif !important;
          font-size: 12px !important;
          margin: 0 !important;
          padding: 0 !important;
          line-height: 1.3 !important;
        }
        
        .invoice-content {
          width: 190mm !important;
          margin: 0 auto !important;
          padding: 10mm 20mm 10mm 8mm !important;
          background-color: white !important;
          font-family: Arial, sans-serif !important;
          font-size: 12px !important;
          line-height: 1.3 !important;
        }
        
        /* Improved header styling */
        h1 {
          font-size: 24px !important;
          font-weight: bold !important;
          text-align: center !important;
          margin: 0 0 3mm 0 !important;
          letter-spacing: 0.5px !important;
        }
        
        h2 {
          font-size: 18px !important;
          font-weight: bold !important;
          text-align: center !important;
          margin: 0 !important;
          letter-spacing: 1px !important;
        }
        
        /* Info table styling - no borders */
        .invoice-content > div:nth-child(3) table,
        .invoice-content > div:nth-child(3) table th,
        .invoice-content > div:nth-child(3) table td {
          border: none !important;
          padding: 1.5mm 0 !important;
          font-size: 11px !important;
        }
        
        /* Product table styling */
        .invoice-content > div:nth-child(4) table {
          width: 100% !important;
          border-collapse: collapse !important;
          font-size: 10px !important;
        }
        
        .invoice-content > div:nth-child(4) th,
        .invoice-content > div:nth-child(4) td {
          border: 1px solid rgb(0, 0, 0) !important;
          padding: 5px 8px !important;
          font-size: 10px !important;
        }
        
        .invoice-content > div:nth-child(4) th {
          background-color: rgb(240, 240, 240) !important;
          font-weight: bold !important;
        }
        
        /* Color overrides */
        .text-blue-600, .text-blue-600 * { color: rgb(37, 99, 235) !important; }
        .text-green-600, .text-green-600 * { color: rgb(22, 163, 74) !important; }
        .text-red-600, .text-red-600 * { color: rgb(220, 38, 38) !important; }
        .text-gray-600, .text-gray-600 * { color: rgb(75, 85, 99) !important; }
        .text-gray-700, .text-gray-700 * { color: rgb(55, 65, 81) !important; }
        .text-gray-900, .text-gray-900 * { color: rgb(17, 24, 39) !important; }
        .bg-gray-50, .bg-gray-50 * { background-color: rgb(249, 250, 251) !important; }
        .bg-white, .bg-white * { background-color: rgb(255, 255, 255) !important; }
        .border-gray-300 { border-color: rgb(0, 0, 0) !important; }
        
        /* Exact column alignment from image */
        .invoice-content > div:nth-child(4) th:nth-child(1),
        .invoice-content > div:nth-child(4) td:nth-child(1) { text-align: left !important; } /* PRODUCT */
        .invoice-content > div:nth-child(4) th:nth-child(2),
        .invoice-content > div:nth-child(4) td:nth-child(2) { text-align: left !important; } /* BATCH NO */
        .invoice-content > div:nth-child(4) th:nth-child(3),
        .invoice-content > div:nth-child(4) td:nth-child(3) { text-align: left !important; } /* POLICY */
        .invoice-content > div:nth-child(4) th:nth-child(4),
        .invoice-content > div:nth-child(4) td:nth-child(4) { text-align: center !important; } /* QTY */
        .invoice-content > div:nth-child(4) th:nth-child(5),
        .invoice-content > div:nth-child(4) td:nth-child(5) { text-align: right !important; } /* GSV */
        .invoice-content > div:nth-child(4) th:nth-child(6),
        .invoice-content > div:nth-child(4) td:nth-child(6) { text-align: right !important; } /* Gross Value */
        .invoice-content > div:nth-child(4) th:nth-child(7),
        .invoice-content > div:nth-child(4) td:nth-child(7) { text-align: right !important; } /* Disc % */
        .invoice-content > div:nth-child(4) th:nth-child(8),
        .invoice-content > div:nth-child(4) td:nth-child(8) { text-align: right !important; } /* Discount Amount */
        .invoice-content > div:nth-child(4) th:nth-child(9),
        .invoice-content > div:nth-child(4) td:nth-child(9) { text-align: center !important; } /* Carton/Bags/Drums */
        .invoice-content > div:nth-child(4) th:nth-child(10),
        .invoice-content > div:nth-child(4) td:nth-child(10) { text-align: center !important; } /* Packs */
        .invoice-content > div:nth-child(4) th:nth-child(11),
        .invoice-content > div:nth-child(4) td:nth-child(11) { text-align: right !important; } /* NSV Value */
      `;
      clonedContent.appendChild(style);

      // Generate canvas from HTML
      const canvas = await html2canvas(clonedContent, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: clonedContent.scrollWidth,
        height: clonedContent.scrollHeight,
        onclone: (clonedDoc) => {
          // Additional color overrides in the cloned document
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const element = el as HTMLElement;
            const computedStyle = window.getComputedStyle(element);
            
            // Force background colors to rgb format
            if (computedStyle.backgroundColor && computedStyle.backgroundColor.includes('lab')) {
              element.style.backgroundColor = 'rgb(255, 255, 255)';
            }
            
            // Force text colors to rgb format
            if (computedStyle.color && computedStyle.color.includes('lab')) {
              element.style.color = 'rgb(0, 0, 0)';
            }
            
            // Force border colors to rgb format
            if (computedStyle.borderColor && computedStyle.borderColor.includes('lab')) {
              element.style.borderColor = 'rgb(209, 213, 219)';
            }
          });
        },
      });

      // Remove cloned element
      document.body.removeChild(clonedContent);

      // Create PDF with small margins
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Calculate dimensions with small margins
      const imgWidth = 200; // A4 width in mm minus small margin
      const pageHeight = 290; // A4 height in mm minus small margin
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 5; // Small top margin

      // Add first page
      pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download PDF
      pdf.save(`invoice_${invoice.invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error exporting PDF. Please try again.');
    } finally {
      setExporting(false);
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
            <p className="text-gray-600">The invoice you&apos;re looking for doesn&apos;t exist.</p>
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
          <Button onClick={exportToPDF} disabled={exporting}>
            <FileText className="h-4 w-4 mr-2" />
            {exporting ? 'Generating PDF...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Invoice Content - Hidden on page, only visible in PDF */}
      <div className="invoice-content" style={{ 
        display: 'none' // Hidden from page view
      }}>
        <div style={{ 
          fontFamily: 'Arial, sans-serif', 
          fontSize: '12px',
          width: '190mm',
          margin: '0 auto',
          padding: '10mm 20mm 10mm 8mm',
          backgroundColor: 'white',
          lineHeight: '1.3'
        }}>
        {/* Company Header */}
        <div style={{ textAlign: 'center', marginBottom: '8mm' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            margin: '0 0 3mm 0',
            letterSpacing: '0.5px'
          }}>
            HYLAND INTERNATIONAL
          </h1>
          <p style={{ 
            fontSize: '11px', 
            margin: '0',
            letterSpacing: '0.3px'
          }}>
            126-F GULISTAN COLONY OLD BWP ROAD MULTAN
          </p>
        </div>

        {/* Invoice Title */}
        <div style={{ textAlign: 'center', marginBottom: '6mm' }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 'bold',
            margin: '0',
            letterSpacing: '1px'
          }}>
            SALES INVOICE
          </h2>
        </div>

        {/* Invoice Details - Two Column Layout */}
        <div style={{ display: 'flex', marginBottom: '6mm', gap: '10mm' }}>
          {/* Left Column - Customer Info */}
          <div style={{ width: '50%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: '40%', paddingBottom: '1.5mm' }}>Invoice #:</td>
                  <td style={{ paddingBottom: '1.5mm' }}>{invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', paddingBottom: '1.5mm' }}>Customer Name:</td>
                  <td style={{ paddingBottom: '1.5mm' }}>{invoice.customerId.name}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', paddingBottom: '1.5mm' }}>G.S.T. No.:</td>
                  <td style={{ paddingBottom: '1.5mm' }}></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', paddingBottom: '1.5mm' }}>Address:</td>
                  <td style={{ paddingBottom: '1.5mm' }}>{invoice.customerId.area}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', paddingBottom: '1.5mm' }}>Territory:</td>
                  <td style={{ paddingBottom: '1.5mm' }}>{invoice.customerId.area} ({invoice.customerId.name.split(' ')[0]})</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', paddingBottom: '1.5mm' }}>P.O.D:</td>
                  <td style={{ paddingBottom: '1.5mm' }}></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right Column - Invoice Info */}
          <div style={{ width: '50%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: '45%', paddingBottom: '1.5mm' }}>Date:</td>
                  <td style={{ paddingBottom: '1.5mm' }}>{formatDate(invoice.invoiceDate)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', paddingBottom: '1.5mm' }}>Ref. No.:</td>
                  <td style={{ paddingBottom: '1.5mm' }}>{invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', paddingBottom: '1.5mm' }}>Employee Name:</td>
                  <td style={{ paddingBottom: '1.5mm' }}>{invoice.createdBy.name}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', paddingBottom: '1.5mm' }}>Order #:</td>
                  <td style={{ paddingBottom: '1.5mm' }}></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', paddingBottom: '1.5mm' }}>Store:</td>
                  <td style={{ paddingBottom: '1.5mm' }}>BULK HYLAND</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Products Table */}
        <div style={{ marginBottom: '6mm' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            border: '1px solid black',
            fontSize: '10px'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#F0F0F0' }}>
                <th style={{ border: '1px solid black', padding: '5px 8px', fontWeight: 'bold', textAlign: 'left' }}>PRODUCT</th>
                <th style={{ border: '1px solid black', padding: '5px 8px', fontWeight: 'bold', textAlign: 'left' }}>BATCH NO.</th>
                <th style={{ border: '1px solid black', padding: '5px 8px', fontWeight: 'bold', textAlign: 'left' }}>POLICY</th>
                <th style={{ border: '1px solid black', padding: '5px 8px', fontWeight: 'bold', textAlign: 'center' }}>QTY</th>
                <th style={{ border: '1px solid black', padding: '5px 8px', fontWeight: 'bold', textAlign: 'right' }}>GSV (PKR)</th>
                <th style={{ border: '1px solid black', padding: '5px 8px', fontWeight: 'bold', textAlign: 'right' }}>Gross Value (PKR)</th>
                <th style={{ border: '1px solid black', padding: '5px 8px', fontWeight: 'bold', textAlign: 'right' }}>Disc. %</th>
                <th style={{ border: '1px solid black', padding: '5px 8px', fontWeight: 'bold', textAlign: 'right' }}>Discount Amount</th>
                <th style={{ border: '1px solid black', padding: '5px 8px', fontWeight: 'bold', textAlign: 'center' }}>Carton/Bags/Drums</th>
                <th style={{ border: '1px solid black', padding: '5px 8px', fontWeight: 'bold', textAlign: 'center' }}>Packs</th>
                <th style={{ border: '1px solid black', padding: '5px 8px', fontWeight: 'bold', textAlign: 'right' }}>NSV Value (PKR)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'left' }}>{item.nameSnapshot}</td>
                  <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'left' }}></td>
                  <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'left' }}>CASH</td>
                  <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'right' }}>{item.rate.toLocaleString()}</td>
                  <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'right' }}>{item.amount.toLocaleString()}.00</td>
                  <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'right' }}>.00</td>
                  <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'right' }}>.00</td>
                  <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'center' }}>{Math.ceil(item.quantity / 25)}</td>
                  <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'center' }}></td>
                  <td style={{ border: '1px solid black', padding: '5px 8px', textAlign: 'right' }}>{item.amount.toLocaleString()}.00</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Section */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', lineHeight: '1.5' }}>
            <div style={{ marginBottom: '2mm' }}>
              Total Amount: {invoice.totalAmount.toLocaleString()}.00 PKR
            </div>
            <div style={{ marginBottom: '2mm' }}>
              Paid Amount: {invoice.paidAmount.toLocaleString()}.00 PKR
            </div>
            <div>
              Due Amount: {invoice.dueAmount.toLocaleString()}.00 PKR
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Interactive Invoice Details */}
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
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
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
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 border border-green-600"
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
