import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Invoice, Payment, Customer } from '@/models';
import { calculateRunningBalance } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
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

    // Add invoice entries
    invoices.forEach(invoice => {
      ledgerEntries.push({
        date: invoice.invoiceDate,
        description: `Invoice #${invoice.invoiceNumber}`,
        invoiceNumber: invoice.invoiceNumber,
        debit: invoice.totalAmount,
        credit: 0,
        customer: invoice.customerId,
        createdBy: invoice.createdBy,
      });
    });

    // Add payment entries
    payments.forEach(payment => {
      ledgerEntries.push({
        date: payment.paymentDate,
        description: `Payment for Invoice #${payment.invoiceId.invoiceNumber}`,
        invoiceNumber: payment.invoiceId.invoiceNumber,
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

    // Calculate totals
    const totalCredit = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
    const currentBalance = totalCredit - totalPaid;

    return NextResponse.json({
      entries: ledgerEntries,
      summary: {
        totalCredit,
        totalPaid,
        currentBalance,
        totalEntries: ledgerEntries.length,
      },
    });
  } catch (error) {
    console.error('Error generating ledger:', error);
    return NextResponse.json(
      { error: 'Failed to generate ledger' },
      { status: 500 }
    );
  }
}
