'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Download, BookOpen, FileText, Printer } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Customer {
  _id: string;
  name: string;
  area: string;
}

interface LedgerEntry {
  vNo: string;
  date: string;
  productName: string;
  qty: number;
  rateVt: number;
  policy: string;
  prInv: string;
  amount: number;
  discReference: string;
  debit: number;
  credit: number;
  balance: number;
  customer: Customer;
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
  const [exporting, setExporting] = useState(false);
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

  const exportToPDF = async () => {
    try {
      setExporting(true);
      // Import jsPDF dynamically
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      
      // Get only the ledger content (excluding export buttons)
      const ledgerContent = document.querySelector('.ledger-content');
      if (!ledgerContent) {
        toast.error('No ledger data to export');
        return;
      }

      // Clone the element to avoid modifying the original
      const clonedContent = ledgerContent.cloneNode(true) as HTMLElement;
      clonedContent.style.position = 'absolute';
      clonedContent.style.left = '-9999px';
      clonedContent.style.top = '0';
      document.body.appendChild(clonedContent);

      // Override any LAB colors with standard colors
      const style = document.createElement('style');
      style.textContent = `
        * {
          color: rgb(0, 0, 0) !important;
          background-color: rgb(255, 255, 255) !important;
          border-color: rgb(209, 213, 219) !important;
        }
        
        /* Add some padding to table cells for better spacing */
        th, td {
          padding: 6px 8px !important;
        }
        
        .text-blue-600, .text-blue-600 * { color: rgb(37, 99, 235) !important; }
        .text-green-600, .text-green-600 * { color: rgb(22, 163, 74) !important; }
        .text-red-600, .text-red-600 * { color: rgb(220, 38, 38) !important; }
        .text-gray-600, .text-gray-600 * { color: rgb(75, 85, 99) !important; }
        .text-gray-700, .text-gray-700 * { color: rgb(55, 65, 81) !important; }
        .text-gray-900, .text-gray-900 * { color: rgb(17, 24, 39) !important; }
        .bg-gray-50, .bg-gray-50 * { background-color: rgb(249, 250, 251) !important; }
        .bg-white, .bg-white * { background-color: rgb(255, 255, 255) !important; }
        .border-gray-300 { border-color: rgb(209, 213, 219) !important; }
        .hover\\:bg-gray-50:hover { background-color: rgb(249, 250, 251) !important; }
        table, th, td { border-color: rgb(209, 213, 219) !important; }
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
      const customerName = entries[0]?.customer?.name || 'All_Customers';
      pdf.save(`ledger_${customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error exporting PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams();
      
      if (filters.customerId) params.append('customerId', filters.customerId);
      if (filters.area) params.append('area', filters.area);
      if (filters.createdBy) params.append('createdBy', filters.createdBy);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      
      const response = await fetch(`/api/ledger/export-csv?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ledger_${entries[0]?.customer?.name?.replace(/\s+/g, '_') || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Error exporting CSV. Please try again.');
    }
  };

  const printLedger = () => {
    // Get the ledger content
    const ledgerContent = document.querySelector('.ledger-content');
    if (!ledgerContent) {
      toast.error('No ledger data to print');
      return;
    }

    // Create a temporary div with the print content
    const printDiv = document.createElement('div');
    printDiv.innerHTML = `
      <div style="font-family: Arial, sans-serif; background: white; padding: 20px;">
        <style>
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #000; 
            padding-bottom: 10px; 
          }
          .header h1 { 
            font-size: 24px; 
            font-weight: bold; 
            margin: 0 0 10px 0; 
          }
          .header p { 
            margin: 2px 0; 
            font-size: 12px; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px; 
          }
          th, td { 
            border: 1px solid #000; 
            padding: 4px; 
            text-align: left; 
            font-size: 10px; 
          }
          th { 
            background-color: #f0f0f0; 
            font-weight: bold; 
            text-align: center; 
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .summary { 
            margin-top: 20px; 
            border-top: 2px solid #000; 
            padding-top: 10px; 
          }
          .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 20px; 
            text-align: center; 
          }
          .summary-value { 
            font-weight: bold; 
            font-size: 14px; 
          }
          .summary-label { 
            font-size: 10px; 
            color: #666; 
          }
          @media print {
            body { margin: 0; padding: 0; }
            table { page-break-inside: avoid; }
            tr { page-break-inside: avoid; }
          }
        </style>
        ${ledgerContent.innerHTML}
      </div>
    `;

    // Add to body temporarily
    document.body.appendChild(printDiv);

    // Hide all other content
    const originalDisplay = Array.from(document.body.children).map(child => {
      const element = child as HTMLElement;
      const display = element.style.display;
      if (element !== printDiv) {
        element.style.display = 'none';
      }
      return display;
    });

    // Print
    window.print();

    // Restore original display
    Array.from(document.body.children).forEach((child, index) => {
      const element = child as HTMLElement;
      if (element !== printDiv) {
        element.style.display = originalDisplay[index];
      }
    });

    // Remove temporary div
    document.body.removeChild(printDiv);
  };

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .print\\:border-0 { border: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-b-2 { border-bottom: 2px solid #000 !important; }
          table { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
      <div className="no-print">
        <h1 className="text-3xl font-bold text-gray-900">Customer Ledger</h1>
        <p className="text-gray-600">View customer account statements and running balances</p>
      </div>

      <Card className="no-print">
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
        <Card className="no-print">
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

      {/* Ledger Report - Matching the image format */}
      {entries.length > 0 && (
        <div className="bg-white border border-gray-300 print:border-0 print:shadow-none">
          {/* Export Buttons - Next to Ledger Data */}
          <div className="border-b border-gray-300 p-4 bg-gray-50 no-print">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={exporting}>
                <FileText className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF} disabled={exporting}>
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Generating PDF...' : 'Export PDF'}
              </Button>
              <Button variant="outline" size="sm" onClick={printLedger} disabled={exporting}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Ledger Content - This is what gets exported/printed */}
          <div className="ledger-content">
            {/* Header Section */}
            <div className="border-b border-gray-300 p-4 print:border-b-2">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">HYLAND INTERNATIONAL</h1>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Customer:</strong> {entries[0]?.customer.name} {entries[0]?.customer.area}</p>
                  <p><strong>Area:</strong> {entries[0]?.customer.area} ({entries[0]?.customer.name})</p>
                  <p><strong>Period:</strong> {filters.fromDate ? formatDate(filters.fromDate) : '01.01.25'} To {filters.toDate ? formatDate(filters.toDate) : formatDate(new Date())}</p>
                  <p><strong>Generated:</strong> {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
              </div>
            </div>

           {/* Ledger Table */}
           <div className="overflow-x-auto">
             <table className="w-full border-collapse border border-gray-300">
               <thead>
                 <tr className="bg-gray-50">
                   <th className="border border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">V No</th>
                   <th className="border border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                   <th className="border border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-700 uppercase">Product Name</th>
                   <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700 uppercase">Qty</th>
                   <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700 uppercase">Rate V.T</th>
                   <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700 uppercase">Policy</th>
                   <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700 uppercase">PR INV</th>
                   <th className="border border-gray-300 px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                   <th className="border border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-700 uppercase">Disc Reference</th>
                   <th className="border border-gray-300 px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase">Debit</th>
                   <th className="border border-gray-300 px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase">Credit</th>
                   <th className="border border-gray-300 px-2 py-2 text-right text-xs font-medium text-gray-700 uppercase">Balance</th>
                 </tr>
               </thead>
               <tbody>
                 {entries.map((entry, index) => (
                   <tr key={index} className="hover:bg-gray-50">
                     <td className="border border-gray-300 px-2 py-1 text-xs">{entry.vNo}</td>
                     <td className="border border-gray-300 px-2 py-1 text-xs">{entry.date}</td>
                     <td className="border border-gray-300 px-2 py-1 text-xs">{entry.productName}</td>
                     <td className="border border-gray-300 px-2 py-1 text-xs text-center">{entry.qty}</td>
                     <td className="border border-gray-300 px-2 py-1 text-xs text-center">{entry.rateVt} SI</td>
                     <td className="border border-gray-300 px-2 py-1 text-xs text-center">{entry.policy}</td>
                     <td className="border border-gray-300 px-2 py-1 text-xs text-center">{entry.prInv}</td>
                     <td className="border border-gray-300 px-2 py-1 text-xs text-right">{entry.amount.toLocaleString()}</td>
                     <td className="border border-gray-300 px-2 py-1 text-xs text-center">{entry.discReference}</td>
                     <td className="border border-gray-300 px-2 py-1 text-xs text-right">{entry.debit > 0 ? entry.debit.toLocaleString() : ''}</td>
                     <td className="border border-gray-300 px-2 py-1 text-xs text-right">{entry.credit > 0 ? entry.credit.toLocaleString() : ''}</td>
                     <td className="border border-gray-300 px-2 py-1 text-xs text-right font-medium">{entry.balance.toLocaleString()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

          {/* Summary Section */}
          {summary && (
            <div className="border-t border-gray-300 p-4 bg-gray-50">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-blue-600  mb-2">{summary.totalCredit.toLocaleString()}</div>
                  <div className="text-gray-600">Total Credit</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600 mb-2">{summary.totalPaid.toLocaleString()}</div>
                  <div className="text-gray-600">Total Paid</div>
                </div>
                <div className="text-center">
                  <div className={`font-semibold mb-2 ${summary.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {summary.currentBalance.toLocaleString()}
                  </div>
                  <div className="text-gray-600">Current Balance</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-600 mb-2">{summary.totalEntries}</div>
                  <div className="text-gray-600">Total Entries</div>
                </div>
              </div>
            </div>
          )}
          </div> {/* Close ledger-content */}
        </div>
      )}

      {/* Empty State */}
      {!loading && entries.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No ledger entries found. Apply filters and click &quot;Generate Ledger&quot; to view entries.</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-500">Generating ledger...</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
