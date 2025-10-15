'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Printer, CreditCard, X, Loader2, Download } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [invoiceType, setInvoiceType] = useState<'sales' | 'delivery'>('sales');
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
        toast.error(data.error || 'Failed to fetch invoice');
        router.push('/invoices');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to fetch invoice');
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

  const exportToPDF = async () => {
    if (!invoice) return;
    
    try {
      setExporting(true);
      toast.loading('Generating PDF...', { id: 'pdf-export' });
      
      const invoiceElement = document.getElementById(`invoice-content-${invoiceType}`);
      if (!invoiceElement) {
        toast.error('Invoice content not found', { id: 'pdf-export' });
        return;
      }

      // Temporarily show the hidden invoice content
      invoiceElement.style.display = 'block';
      
      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      // Hide it again
      invoiceElement.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${invoiceType === 'sales' ? 'Sales-Invoice' : 'Delivery-Challan'}-${invoice.invoiceNumber}.pdf`);
      
      toast.success('PDF exported successfully!', { id: 'pdf-export' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF', { id: 'pdf-export' });
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    if (!invoice) return;
    
    const invoiceElement = document.getElementById(`invoice-content-${invoiceType}`);
    if (!invoiceElement) {
      toast.error('Invoice content not found');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups for printing');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${invoiceType === 'sales' ? 'Sales Invoice' : 'Delivery Challan'} ${invoice.invoiceNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: white;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${invoiceElement.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

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
          invoiceId: invoice._id,
          amount: paymentAmount,
          paymentDate: paymentDate,
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || 'Failed to create payment record');
      }

      // Then, update the invoice
      const updateResponse = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paidAmount: invoice.paidAmount + paymentAmount,
          dueAmount: invoice.dueAmount - paymentAmount,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to update invoice');
      }

      toast.success('Payment recorded successfully!');
      setShowPaymentModal(false);
      setPaymentAmount(0);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      
      // Refresh invoice data
      await fetchInvoice();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record payment');
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
            <h1 className="text-3xl font-bold text-gray-900">Loading...</h1>
            <p className="text-gray-600">Fetching invoice details</p>
          </div>
        </div>
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
            <p className="text-gray-600">The requested invoice could not be found</p>
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
          <div className="flex items-center gap-2">
            <Label htmlFor="invoice-type" className="text-sm font-medium">Type:</Label>
            <select
              id="invoice-type"
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value as 'sales' | 'delivery')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="sales">Sales Invoice</option>
              <option value="delivery">Delivery Challan</option>
            </select>
          </div>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={exportToPDF} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Generating PDF...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Invoice Content Templates - Hidden on page, only visible in PDF */}
      
      {/* Sales Invoice Template */}
      <div id="invoice-content-sales" style={{ display: 'none' }}>
        <div style={{ 
          fontFamily: 'Arial, sans-serif', 
          fontSize: '12px',
          width: '210mm',
          margin: '0 auto',
          padding: '10mm',
          backgroundColor: 'white',
          lineHeight: '1.3',
          border: '2px solid #000',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
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
              letterSpacing: '1px',
              textDecoration: 'underline'
            }}>
              SALES INVOICE
            </h2>
          </div>

          {/* Invoice Details - Two Column Layout */}
          <div style={{ 
            display: 'flex', 
            marginBottom: '6mm', 
            gap: '10mm',
            border: '1px solid #ccc',
            padding: '4mm',
            borderRadius: '2px'
          }}>
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
                    <td style={{ fontWeight: 'bold', width: '40%', paddingBottom: '1.5mm' }}>Date:</td>
                    <td style={{ paddingBottom: '1.5mm' }}>{new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}</td>
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
                    <td style={{ paddingBottom: '1.5mm' }}>FINISHED STORE</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '6mm' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'left', fontWeight: 'bold' }}>PRODUCT</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'left', fontWeight: 'bold' }}>BATCH NO.</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'left', fontWeight: 'bold' }}>POLICY</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center', fontWeight: 'bold' }}>QTY</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center', fontWeight: 'bold' }}>GSV (PKR)</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center', fontWeight: 'bold' }}>Gross Value (PKR)</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center', fontWeight: 'bold' }}>Disc. %</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center', fontWeight: 'bold' }}>Discount Amount</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center', fontWeight: 'bold' }}>Carton/Bags/Drums</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center', fontWeight: 'bold' }}>PACKS</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center', fontWeight: 'bold' }}>NSV Value (PKR)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #000', padding: '2mm' }}>{item.nameSnapshot}</td>
                  <td style={{ border: '1px solid #000', padding: '2mm' }}>AMPL-2025/LMB-01</td>
                  <td style={{ border: '1px solid #000', padding: '2mm' }}>CASH</td>
                  <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>{item.rate}</td>
                  <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'right' }}>{item.amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                  <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>.00</td>
                  <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>.00</td>
                  <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>{Math.ceil(item.quantity / 40)}</td>
                  <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}></td>
                  <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'right' }}>{item.amount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                <td style={{ border: '1px solid #000', padding: '2mm' }} colSpan={3}>Total:</td>
                <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>{invoice.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                <td style={{ border: '1px solid #000', padding: '2mm' }}></td>
                <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'right' }}>{invoice.totalAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>.00</td>
                <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>.00</td>
                <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>{invoice.items.reduce((sum, item) => sum + Math.ceil(item.quantity / 40), 0)}</td>
                <td style={{ border: '1px solid #000', padding: '2mm' }}></td>
                <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'right' }}>{invoice.totalAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          {/* Dispatch/Delivery Details */}
          <div style={{ 
            marginBottom: '6mm',
            border: '1px solid #ccc',
            padding: '4mm',
            borderRadius: '2px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: '15%' }}>Gate Pass #:</td>
                  <td style={{ width: '15%' }}></td>
                  <td style={{ fontWeight: 'bold', width: '15%' }}>G.P. Date:</td>
                  <td style={{ width: '15%' }}></td>
                  <td style={{ fontWeight: 'bold', width: '15%' }}>Veh. #:</td>
                  <td style={{ width: '15%' }}></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Bilty #:</td>
                  <td></td>
                  <td style={{ fontWeight: 'bold' }}>Transporter:</td>
                  <td></td>
                  <td style={{ fontWeight: 'bold' }}>Driver Name:</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div style={{ 
            marginBottom: '6mm',
            border: '1px solid #ccc',
            padding: '4mm',
            borderRadius: '2px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: '20%' }}>Opening Balance:</td>
                  <td style={{ width: '20%' }}></td>
                  <td style={{ fontWeight: 'bold', width: '20%' }}>This Invoice:</td>
                  <td style={{ width: '20%', textAlign: 'right' }}>{invoice.totalAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Net Balance:</td>
                  <td></td>
                  <td></td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{invoice.totalAmount.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '15mm',
            border: '1px solid #ccc',
            padding: '4mm',
            borderRadius: '2px'
          }}>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '2mm', height: '20px' }}></div>
              <p style={{ fontSize: '10px', fontWeight: 'bold' }}>Prepared By</p>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '2mm', height: '20px' }}></div>
              <p style={{ fontSize: '10px', fontWeight: 'bold' }}>Approved By</p>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '2mm', height: '20px' }}></div>
              <p style={{ fontSize: '10px', fontWeight: 'bold' }}>Dealer&apos;s Signature & Stamp</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Challan Template */}
      <div id="invoice-content-delivery" style={{ display: 'none' }}>
        <div style={{ 
          fontFamily: 'Arial, sans-serif', 
          fontSize: '12px',
          width: '210mm',
          margin: '0 auto',
          padding: '10mm',
          backgroundColor: 'white',
          lineHeight: '1.3',
          border: '2px solid #000',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
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

          {/* Document Title */}
          <div style={{ textAlign: 'center', marginBottom: '6mm' }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold',
              margin: '0',
              letterSpacing: '1px',
              textDecoration: 'underline'
            }}>
              DELIVERY CHALLAN / INVOICE
            </h2>
          </div>

          {/* Document Details - Two Column Layout */}
          <div style={{ 
            display: 'flex', 
            marginBottom: '6mm', 
            gap: '10mm',
            border: '1px solid #ccc',
            padding: '4mm',
            borderRadius: '2px'
          }}>
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

            {/* Right Column - Document Info */}
            <div style={{ width: '50%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold', width: '40%', paddingBottom: '1.5mm' }}>Date:</td>
                    <td style={{ paddingBottom: '1.5mm' }}>{new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', paddingBottom: '1.5mm' }}>Ref. No.:</td>
                    <td style={{ paddingBottom: '1.5mm' }}>{invoice.invoiceNumber}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Order and Store Info */}
          <div style={{ 
            marginBottom: '6mm',
            border: '1px solid #ccc',
            padding: '4mm',
            borderRadius: '2px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: '15%' }}>Order #:</td>
                  <td style={{ width: '35%' }}></td>
                  <td style={{ fontWeight: 'bold', width: '15%' }}>Store:</td>
                  <td style={{ width: '35%' }}>FINISHED STORE</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '6mm' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'left', fontWeight: 'bold' }}>PRODUCT</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'left', fontWeight: 'bold' }}>BATCH NO.</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'left', fontWeight: 'bold' }}>POLICY</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center', fontWeight: 'bold' }}>QTY</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center', fontWeight: 'bold' }}>CARTONS BAGS/DRUMS</th>
                <th style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center', fontWeight: 'bold' }}>PACKS</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #000', padding: '2mm' }}>{item.nameSnapshot}</td>
                  <td style={{ border: '1px solid #000', padding: '2mm' }}>AMPL-2025/LMB-01</td>
                  <td style={{ border: '1px solid #000', padding: '2mm' }}>KM-2025</td>
                  <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>{Math.ceil(item.quantity / 40)}-</td>
                  <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>0</td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                <td style={{ border: '1px solid #000', padding: '2mm' }} colSpan={3}>Total:</td>
                <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>{invoice.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>{invoice.items.reduce((sum, item) => sum + Math.ceil(item.quantity / 40), 0)}</td>
                <td style={{ border: '1px solid #000', padding: '2mm', textAlign: 'center' }}>0</td>
              </tr>
            </tbody>
          </table>

          {/* Delivery Details */}
          <div style={{ 
            marginBottom: '6mm',
            border: '1px solid #ccc',
            padding: '4mm',
            borderRadius: '2px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: '15%' }}>Gate Pass #:</td>
                  <td style={{ width: '15%' }}></td>
                  <td style={{ fontWeight: 'bold', width: '15%' }}>G.P. Date:</td>
                  <td style={{ width: '15%' }}></td>
                  <td style={{ fontWeight: 'bold', width: '15%' }}>Veh. #:</td>
                  <td style={{ width: '15%' }}></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Bilty #:</td>
                  <td></td>
                  <td style={{ fontWeight: 'bold' }}>Transporter:</td>
                  <td></td>
                  <td style={{ fontWeight: 'bold' }}>Driver Name:</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '15mm',
            border: '1px solid #ccc',
            padding: '4mm',
            borderRadius: '2px'
          }}>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '2mm', height: '20px' }}></div>
              <p style={{ fontSize: '10px', fontWeight: 'bold' }}>Prepared By</p>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '2mm', height: '20px' }}></div>
              <p style={{ fontSize: '10px', fontWeight: 'bold' }}>Approved By</p>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '2mm', height: '20px' }}></div>
              <p style={{ fontSize: '10px', fontWeight: 'bold' }}>Dealer&apos;s Signature & Stamp</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Details Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Invoice Number</Label>
                  <p className="text-lg font-semibold">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Date</Label>
                  <p className="text-lg">{formatDate(invoice.invoiceDate)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Customer</Label>
                  <p className="text-lg">{invoice.customerId.name}</p>
                  <p className="text-sm text-gray-500">{invoice.customerId.area}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Created By</Label>
                  <p className="text-lg">{invoice.createdBy.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.nameSnapshot}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.rate)}</TableCell>
                      <TableCell>{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Total Amount:</span>
                <span className="font-semibold">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Paid Amount:</span>
                <span className="font-semibold text-green-600">{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Due Amount:</span>
                <span className={`font-semibold ${invoice.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(invoice.dueAmount)}
                </span>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    invoice.dueAmount === 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {invoice.dueAmount === 0 ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
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
                  <h4 className="font-medium text-gray-900 mb-2">Payment Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Current Due:</span>
                      <span>{formatCurrency(invoice.dueAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Amount:</span>
                      <span>{formatCurrency(paymentAmount)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Remaining Due:</span>
                      <span>{formatCurrency(invoice.dueAmount - paymentAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
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