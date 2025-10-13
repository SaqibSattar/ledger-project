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

    // Calculate totals
    const totalCredit = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
    const currentBalance = totalCredit - totalPaid;

    // Generate HTML for PDF
    const customerName = ledgerEntries[0]?.customer?.name || 'All Customers';
    const customerArea = ledgerEntries[0]?.customer?.area || 'All Areas';
    const periodFrom = fromDate ? new Date(fromDate).toLocaleDateString('en-GB') : '01.01.25';
    const periodTo = toDate ? new Date(toDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    const generatedAt = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ledger Report - ${customerName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { font-size: 24px; font-weight: bold; margin: 0 0 10px 0; }
          .header p { margin: 2px 0; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 4px; text-align: left; font-size: 10px; }
          th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .summary { margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; text-align: center; }
          .summary-item { }
          .summary-value { font-weight: bold; font-size: 14px; }
          .summary-label { font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>HYLAND INTERNATIONAL</h1>
          <p><strong>Customer:</strong> ${customerName} ${customerArea}</p>
          <p><strong>Area:</strong> ${customerArea} (${customerName})</p>
          <p><strong>Period:</strong> ${periodFrom} To ${periodTo}</p>
          <p><strong>Generated:</strong> ${generatedAt}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>V No</th>
              <th>Date</th>
              <th>Product Name</th>
              <th>Qty</th>
              <th>Rate V.T</th>
              <th>Policy</th>
              <th>PR INV</th>
              <th class="text-right">Amount</th>
              <th>Disc Reference</th>
              <th class="text-right">Debit</th>
              <th class="text-right">Credit</th>
              <th class="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${ledgerEntries.map(entry => `
              <tr>
                <td>${entry.vNo}</td>
                <td>${entry.date}</td>
                <td>${entry.productName}</td>
                <td class="text-center">${entry.qty}</td>
                <td class="text-center">${entry.rateVt} SI</td>
                <td class="text-center">${entry.policy}</td>
                <td class="text-center">${entry.prInv}</td>
                <td class="text-right">${entry.amount.toLocaleString()}</td>
                <td class="text-center">${entry.discReference}</td>
                <td class="text-right">${entry.debit > 0 ? entry.debit.toLocaleString() : ''}</td>
                <td class="text-right">${entry.credit > 0 ? entry.credit.toLocaleString() : ''}</td>
                <td class="text-right">${entry.balance.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value" style="color: #2563eb;">${totalCredit.toLocaleString()}</div>
              <div class="summary-label">Total Credit</div>
            </div>
            <div class="summary-item">
              <div class="summary-value" style="color: #16a34a;">${totalPaid.toLocaleString()}</div>
              <div class="summary-label">Total Paid</div>
            </div>
            <div class="summary-item">
              <div class="summary-value" style="color: ${currentBalance > 0 ? '#dc2626' : '#16a34a'};">${currentBalance.toLocaleString()}</div>
              <div class="summary-label">Current Balance</div>
            </div>
            <div class="summary-item">
              <div class="summary-value" style="color: #6b7280;">${ledgerEntries.length}</div>
              <div class="summary-label">Total Entries</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="ledger_${customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html"`,
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
