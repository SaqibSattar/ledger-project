import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Invoice, Payment } from '@/models';
import { authOptions } from '@/lib/auth';

interface SalesAnalytics {
  period: string;
  totalSales: number;
  paidAmount: number;
  pendingAmount: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  averageInvoiceValue: number;
  topProducts: Array<{
    productName: string;
    quantity: number;
    totalAmount: number;
  }>;
  recentInvoices: Array<{
    invoiceNumber: string;
    customerName: string;
    amount: number;
    status: 'paid' | 'pending';
    date: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    
    // Calculate date ranges based on period
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '6months':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    }

    // Get invoices within the date range
    const invoices = await Invoice.find({
      invoiceDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .populate('customerId', 'name area')
    .populate('createdBy', 'name email')
    .sort({ invoiceDate: -1 });

    // Calculate sales metrics
    const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const pendingAmount = totalSales - paidAmount;
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.dueAmount === 0).length;
    const pendingInvoices = totalInvoices - paidInvoices;
    const averageInvoiceValue = totalInvoices > 0 ? totalSales / totalInvoices : 0;

    // Get top products
    const productSales = new Map<string, { quantity: number; totalAmount: number }>();
    
    invoices.forEach(invoice => {
      invoice.items.forEach((item: any) => {
        const productName = item.nameSnapshot;
        if (productSales.has(productName)) {
          const existing = productSales.get(productName)!;
          productSales.set(productName, {
            quantity: existing.quantity + item.quantity,
            totalAmount: existing.totalAmount + item.amount
          });
        } else {
          productSales.set(productName, {
            quantity: item.quantity,
            totalAmount: item.amount
          });
        }
      });
    });

    const topProducts = Array.from(productSales.entries())
      .map(([productName, data]) => ({
        productName,
        quantity: data.quantity,
        totalAmount: data.totalAmount
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    // Get recent invoices
    const recentInvoices = invoices.slice(0, 10).map(invoice => ({
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerId.name,
      amount: invoice.totalAmount,
      status: invoice.dueAmount === 0 ? 'paid' as const : 'pending' as const,
      date: invoice.invoiceDate.toISOString().split('T')[0]
    }));

    // Get payments within the date range
    const payments = await Payment.find({
      paymentDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .populate('invoiceId', 'invoiceNumber customerId')
    .populate('createdBy', 'name email')
    .sort({ paymentDate: -1 });

    const analytics: SalesAnalytics = {
      period,
      totalSales,
      paidAmount,
      pendingAmount,
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      averageInvoiceValue,
      topProducts,
      recentInvoices
    };

    return NextResponse.json({
      analytics,
      payments: payments.map(payment => ({
        id: payment._id,
        amount: payment.amount,
        date: payment.paymentDate.toISOString().split('T')[0],
        invoiceNumber: payment.invoiceId.invoiceNumber,
        customerName: payment.invoiceId.customerId.name,
        createdBy: payment.createdBy.name
      }))
    });

  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales analytics' },
      { status: 500 }
    );
  }
}
