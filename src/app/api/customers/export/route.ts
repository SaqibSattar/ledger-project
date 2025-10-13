import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Customer } from '@/models';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const customers = await Customer.find({})
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Convert to CSV format
    const csvHeaders = [
      'name',
      'area',
      'role',
      'createdBy',
      'createdAt'
    ];

    const csvRows = customers.map(customer => [
      customer.name,
      customer.area,
      customer.role,
      customer.createdBy.name,
      customer.createdAt.toISOString().split('T')[0]
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="customers_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error exporting customers:', error);
    return NextResponse.json(
      { error: 'Failed to export customers' },
      { status: 500 }
    );
  }
}
