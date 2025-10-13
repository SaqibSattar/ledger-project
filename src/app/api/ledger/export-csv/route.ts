import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Invoice, Payment, Customer } from '@/models';
import { authOptions } from '@/lib/auth';
import { calculateRunningBalance } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const area = searchParams.get('area');
    const createdBy = searchParams.get('createdBy');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    if (!customerId && !area) {
      return NextResponse.json(
        { error: 'Either customerId or area must be provided' },
        { status: 400 }
      );
    }

    // Build query for invoices
    const invoiceQuery: any = {};
    if (customerId) {
      invoiceQuery.customerId = customerId;
    }
    if (createdBy) {
      invoiceQuery.createdBy = createdBy;
    }
    if (fromDate || toDate) {
      invoiceQuery.invoiceDate = {};
      if (fromDate) {
        invoiceQuery.invoiceDate.$gte = new Date(fromDate);
      }
      if (toDate) {
        invoiceQuery.invoiceDate.$lte = new Date(toDate);
      }
    }

    // Get invoices
    const invoices = await Invoice.find(invoiceQuery)
      .populate('customerId', 'name area')
      .populate('createdBy', 'name email')
      .sort({ invoiceDate: 1 });

    // If filtering by area, get customers in that area first
    let customerIds = customerId ? [customerId] : [];
    if (area && !customerId) {
      const customers = await Customer.find({ area: { $regex: area, $options: 'i' } });
      customerIds = customers.map(c => c._id);
      
      // Refilter invoices by customer IDs
      const filteredInvoices = invoices.filter(invoice => 
        customerIds.includes(invoice.customerId._id)
      );
      invoices.splice(0, invoices.length, ...filteredInvoices);
    }

    // Get payments for the same customers and date range
    const paymentQuery: any = {};
    if (customerIds.length > 0) {
      paymentQuery.invoiceId = { $in: invoices.map(inv => inv._id) };
    }
    if (createdBy) {
      paymentQuery.createdBy = createdBy;
    }
    if (fromDate || toDate) {
      paymentQuery.paymentDate = {};
      if (fromDate) {
        paymentQuery.paymentDate.$gte = new Date(fromDate);
      }
      if (toDate) {
        paymentQuery.paymentDate.$lte = new Date(toDate);
      }
    }

    const payments = await Payment.find(paymentQuery)
      .populate('invoiceId', 'customerId invoiceNumber')
      .populate('createdBy', 'name email')
      .sort({ paymentDate: 1 });

    // Create ledger entries
    const ledgerEntries: any[] = [];

    // Add invoice entries with detailed product information
    invoices.forEach(invoice => {
      invoice.items.forEach((item: any) => {
        ledgerEntries.push({
          vNo: invoice.invoiceNumber,
          date: invoice.invoiceDate.toISOString().split('T')[0].split('-').reverse().join('-').slice(0, 8),
          productName: item.nameSnapshot,
          qty: item.quantity,
          rateVt: item.rate,
          policy: 'CASH',
          prInv: '',
          amount: item.amount,
          discReference: '',
          debit: item.amount,
          credit: 0,
          customer: invoice.customerId,
          createdBy: invoice.createdBy,
        });
      });
    });

    // Add payment entries
    payments.forEach(payment => {
      ledgerEntries.push({
        vNo: `PAY-${payment._id.toString().slice(-4)}`,
        date: payment.paymentDate.toISOString().split('T')[0].split('-').reverse().join('-').slice(0, 8),
        productName: `Payment for Invoice #${payment.invoiceId.invoiceNumber}`,
        qty: 1,
        rateVt: payment.amount,
        policy: 'CASH',
        prInv: '',
        amount: payment.amount,
        discReference: '',
        debit: 0,
        credit: payment.amount,
        customer: payment.invoiceId.customerId,
        createdBy: payment.createdBy,
      });
    });

    // Sort by date
    ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    const balances = calculateRunningBalance(ledgerEntries);
    ledgerEntries.forEach((entry, index) => {
      entry.balance = balances[index];
    });

    // Convert to CSV format
    const csvHeaders = [
      'V No',
      'Date',
      'Product Name',
      'Qty',
      'Rate V.T',
      'Policy',
      'PR INV',
      'Amount',
      'Disc Reference',
      'Debit',
      'Credit',
      'Balance'
    ];

    const csvRows = ledgerEntries.map(entry => [
      entry.vNo,
      entry.date,
      entry.productName,
      entry.qty,
      entry.rateVt,
      entry.policy,
      entry.prInv,
      entry.amount,
      entry.discReference,
      entry.debit,
      entry.credit,
      entry.balance
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="ledger_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error exporting ledger:', error);
    return NextResponse.json(
      { error: 'Failed to export ledger' },
      { status: 500 }
    );
  }
}
