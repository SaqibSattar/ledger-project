import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Payment, Invoice } from '@/models';
import { paymentSchema } from '@/lib/validations';
import { authOptions } from '@/lib/auth';

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
    const invoiceId = searchParams.get('invoiceId') || '';

    const query: any = {};
    if (invoiceId) {
      query.invoiceId = invoiceId;
    }

    const payments = await Payment.find(query)
      .populate('invoiceId', 'invoiceNumber customerId')
      .populate('createdBy', 'name email')
      .sort({ paymentDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Payment.countDocuments(query);

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
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
    if (body.paymentDate && typeof body.paymentDate === 'string') {
      body.paymentDate = new Date(body.paymentDate);
    }
    
    const validatedData = paymentSchema.parse(body);

    await connectDB();

    // Verify the invoice exists
    const invoice = await Invoice.findById(validatedData.invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check if payment amount doesn't exceed due amount
    if (validatedData.amount > invoice.dueAmount) {
      return NextResponse.json({ 
        error: 'Payment amount cannot exceed the due amount' 
      }, { status: 400 });
    }

    const payment = new Payment({
      ...validatedData,
      createdBy: session.user.id,
    });

    await payment.save();

    return NextResponse.json(payment, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating payment:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: (error as unknown as { errors: unknown }).errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
