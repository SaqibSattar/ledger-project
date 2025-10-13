import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Customer } from '@/models';
import { customerSchema } from '@/lib/validations';
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
    const search = searchParams.get('search') || '';
    const area = searchParams.get('area') || '';

    const query: any = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (area) {
      query.area = { $regex: area, $options: 'i' };
    }

    const customers = await Customer.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Customer.countDocuments(query);

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
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

    const body = await request.json();
    const validatedData = customerSchema.parse(body);

    await connectDB();

    const customer = new Customer({
      ...validatedData,
      createdBy: session.user.id,
    });

    await customer.save();

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
