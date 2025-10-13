import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Invoice, Product } from '@/models';
import { invoiceSchema } from '@/lib/validations';
import { generateInvoiceNumber } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const customerId = searchParams.get('customerId') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';

    const query: any = {};
    
    if (customerId) {
      query.customerId = customerId;
    }
    
    if (fromDate || toDate) {
      query.invoiceDate = {};
      if (fromDate) {
        query.invoiceDate.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.invoiceDate.$lte = new Date(toDate);
      }
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'name area')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Invoice.countDocuments(query);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = invoiceSchema.parse(body);

    await connectDB();

    // Update product stock quantities
    for (const item of validatedData.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stockQuantity: -item.quantity } }
      );
    }

    const invoice = new Invoice({
      ...validatedData,
      invoiceNumber: generateInvoiceNumber(),
      createdBy: session.user.id,
    });

    await invoice.save();

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
