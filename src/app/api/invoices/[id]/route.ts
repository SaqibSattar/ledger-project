import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Invoice } from '@/models';
import { invoiceSchema } from '@/lib/validations';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    await connectDB();
    
    const invoice = await Invoice.findById(params.id)
      .populate('customerId', 'name area')
      .populate('createdBy', 'name email');

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const body = await request.json();
    
    // Convert string dates to Date objects before validation
    if (body.invoiceDate && typeof body.invoiceDate === 'string') {
      body.invoiceDate = new Date(body.invoiceDate);
    }
    
    const validatedData = invoiceSchema.parse(body);

    await connectDB();

    const invoice = await Invoice.findByIdAndUpdate(
      params.id,
      validatedData,
      { new: true, runValidators: true }
    ).populate('customerId', 'name area')
     .populate('createdBy', 'name email');

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    await connectDB();

    const invoice = await Invoice.findByIdAndDelete(params.id);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
