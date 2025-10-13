import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Product } from '@/models';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const products = await Product.find({})
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Convert to CSV format
    const csvHeaders = [
      'name',
      'description',
      'unitPrice',
      'stockQuantity',
      'unit',
      'minStockAlert',
      'registrationNumber',
      'registrationValidUpto',
      'createdBy',
      'createdAt'
    ];

    const csvRows = products.map(product => [
      product.name,
      product.description || '',
      product.unitPrice,
      product.stockQuantity || '',
      product.unit,
      product.minStockAlert || '',
      product.registrationNumber || '',
      product.registrationValidUpto ? product.registrationValidUpto.toISOString().split('T')[0] : '',
      product.createdBy.name,
      product.createdAt.toISOString().split('T')[0]
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="products_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error exporting products:', error);
    return NextResponse.json(
      { error: 'Failed to export products' },
      { status: 500 }
    );
  }
}
