import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Invoice, Payment, Customer } from '@/models';
import { calculateRunningBalance } from '@/lib/utils';
import { authOptions } from '@/lib/auth';

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
    const invoiceQuery: Record<string, unknown> = {};
    if (customerId) {
      invoiceQuery.customerId = customerId;
    }
    if (createdBy) {
      invoiceQuery.createdBy = createdBy;
    }
    if (fromDate || toDate) {
      invoiceQuery.invoiceDate = {};
      if (fromDate) {
        // Set to start of day
        const fromDateObj = new Date(fromDate);
        fromDateObj.setHours(0, 0, 0, 0);
        (invoiceQuery.invoiceDate as Record<string, unknown>).$gte = fromDateObj;
      }
      if (toDate) {
        // Set to end of day
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999);
        (invoiceQuery.invoiceDate as Record<string, unknown>).$lte = toDateObj;
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
    const paymentQuery: Record<string, unknown> = {};
    if (customerIds.length > 0) {
      paymentQuery.invoiceId = { $in: invoices.map(inv => inv._id) };
    }
    if (createdBy) {
      paymentQuery.createdBy = createdBy;
    }
    if (fromDate || toDate) {
      paymentQuery.paymentDate = {};
      if (fromDate) {
        // Set to start of day
        const fromDateObj = new Date(fromDate);
        fromDateObj.setHours(0, 0, 0, 0);
        (paymentQuery.paymentDate as Record<string, unknown>).$gte = fromDateObj;
      }
      if (toDate) {
        // Set to end of day
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999);
        (paymentQuery.paymentDate as Record<string, unknown>).$lte = toDateObj;
      }
    }

    const payments = await Payment.find(paymentQuery)
      .populate('invoiceId', 'customerId invoiceNumber')
      .populate('createdBy', 'name email')
      .sort({ paymentDate: 1 });

    // Create ledger entries in the format matching the image
    const ledgerEntries: Array<{
      vNo: string;
      date: string;
      dateObj: Date; // Add actual date object for sorting
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
      customer: unknown;
      createdBy: unknown;
    }> = [];

    // Add invoice entries with detailed product information
    invoices.forEach(invoice => {
      invoice.items.forEach((item: Record<string, unknown>) => {
        ledgerEntries.push({
          vNo: invoice.invoiceNumber,
          date: invoice.invoiceDate.toISOString().split('T')[0].split('-').reverse().join('-').slice(0, 10), // DD-MM-YYYY format
          dateObj: invoice.invoiceDate, // Keep original date for sorting
          productName: item.nameSnapshot as string,
          qty: item.quantity as number,
          rateVt: item.rate as number,
          policy: 'CASH',
          prInv: '',
          amount: item.amount as number,
          discReference: '',
          debit: item.amount as number,
          credit: 0,
          balance: 0, // Will be calculated later
          customer: invoice.customerId,
          createdBy: invoice.createdBy,
        });
      });
    });

    // Add payment entries
    payments.forEach(payment => {
      ledgerEntries.push({
        vNo: `PAY-${payment._id.toString().slice(-4)}`,
        date: payment.paymentDate.toISOString().split('T')[0].split('-').reverse().join('-').slice(0, 10), // DD-MM-YYYY format
        dateObj: payment.paymentDate, // Keep original date for sorting
        productName: `Payment for Invoice #${payment.invoiceId.invoiceNumber}`,
        qty: 1,
        rateVt: payment.amount,
        policy: 'CASH',
        prInv: '',
        amount: payment.amount,
        discReference: '',
        debit: 0,
        credit: payment.amount,
        balance: 0, // Will be calculated later
        customer: payment.invoiceId.customerId,
        createdBy: payment.createdBy,
      });
    });

    // Add payment entries for invoices with paid amounts but no separate payment records
    invoices.forEach(invoice => {
      const invoicePayments = payments.filter(p => p.invoiceId._id.toString() === invoice._id.toString());
      const totalPaidFromRecords = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
      
      if (invoice.paidAmount > totalPaidFromRecords) {
        // Create a payment entry for the difference
        const paymentAmount = invoice.paidAmount - totalPaidFromRecords;
        ledgerEntries.push({
          vNo: `PAY-${invoice.invoiceNumber.slice(-4)}`,
          date: invoice.invoiceDate.toISOString().split('T')[0].split('-').reverse().join('-').slice(0, 10), // DD-MM-YYYY format
          dateObj: invoice.invoiceDate, // Keep original date for sorting
          productName: `Payment for Invoice #${invoice.invoiceNumber}`,
          qty: 1,
          rateVt: paymentAmount,
          policy: 'CASH',
          prInv: '',
          amount: paymentAmount,
          discReference: '',
          debit: 0,
          credit: paymentAmount,
          balance: 0, // Will be calculated later
          customer: invoice.customerId,
          createdBy: invoice.createdBy,
        });
      }
    });

    // Sort by date using the actual date objects
    ledgerEntries.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // Calculate running balance
    const balances = calculateRunningBalance(ledgerEntries);
    ledgerEntries.forEach((entry, index) => {
      entry.balance = balances[index];
      // Remove dateObj from the response (it was only used for sorting)
      delete (entry as Record<string, unknown>).dateObj;
    });

    // Calculate totals
    const totalCredit = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
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
