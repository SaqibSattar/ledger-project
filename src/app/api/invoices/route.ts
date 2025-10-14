import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Invoice, Product, Customer } from '@/models';
import { invoiceSchema } from '@/lib/validations';
import { generateInvoiceNumber } from '@/lib/utils';
import { authOptions } from '@/lib/auth';

interface QueryFilters {
  customerId?: string | { $in: string[] };
  invoiceDate?: {
    $gte?: Date;
    $lte?: Date;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const customerId = searchParams.get('customerId') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';

    const query: QueryFilters = {};
    
    // Handle search functionality
    if (search) {
      // Find customers that match the search term
      const customerQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { area: { $regex: search, $options: 'i' } }
        ]
      };
      
      const matchingCustomers = await Customer.find(customerQuery).select('_id');
      const customerIds = matchingCustomers.map(customer => customer._id);
      
      if (customerIds.length > 0) {
        query.customerId = { $in: customerIds };
      } else {
        // If no customers match, return empty result
        query.customerId = { $in: [] };
      }
    } else if (customerId) {
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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user ID exists in session
    if (!session.user?.id) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 });
    }

    const body = await request.json();
    
    // Convert string dates to Date objects before validation
    if (body.invoiceDate && typeof body.invoiceDate === 'string') {
      body.invoiceDate = new Date(body.invoiceDate);
    }
    
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
  } catch (error: unknown) {
    console.error('Error creating invoice:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: (error as unknown as { errors: unknown }).errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
