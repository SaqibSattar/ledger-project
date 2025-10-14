import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Customer, Product, Invoice, User } from '@/models';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Fetch counts from database
    const [
      totalCustomers,
      totalProducts,
      totalInvoices,
      totalUsers,
      totalLedgerEntries
    ] = await Promise.all([
      Customer.countDocuments(),
      Product.countDocuments(),
      Invoice.countDocuments(),
      User.countDocuments(),
      // For ledger entries, we'll count unique customers with invoices
      Customer.countDocuments({ 
        _id: { 
          $in: await Invoice.distinct('customerId') 
        } 
      })
    ]);

    // Calculate additional stats
    const totalInvoiceAmount = await Invoice.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const totalPaidAmount = await Invoice.aggregate([
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);

    const totalDueAmount = await Invoice.aggregate([
      { $group: { _id: null, total: { $sum: '$dueAmount' } } }
    ]);

    // Get recent invoices (last 5)
    const recentInvoices = await Invoice.find()
      .populate('customerId', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('invoiceNumber totalAmount invoiceDate customerId createdBy');

    // Get low stock products (stock < minStockAlert)
    const lowStockProducts = await Product.find({
      $expr: { $lt: ['$stockQuantity', '$minStockAlert'] }
    }).select('name stockQuantity minStockAlert unit');

    const stats = {
      totalCustomers,
      totalProducts,
      totalInvoices,
      totalUsers,
      totalLedgerEntries,
      totalInvoiceAmount: totalInvoiceAmount[0]?.total || 0,
      totalPaidAmount: totalPaidAmount[0]?.total || 0,
      totalDueAmount: totalDueAmount[0]?.total || 0,
      recentInvoices,
      lowStockProducts
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
