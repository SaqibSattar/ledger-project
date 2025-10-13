import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Product } from '@/models';
import { productSchema } from '@/lib/validations';
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
    const lowStock = searchParams.get('lowStock') === 'true';

    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (lowStock) {
      query.$expr = {
        $lte: ['$stockQuantity', '$minStockAlert']
      };
    }

    const products = await Product.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Product.countDocuments(query);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
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
    const validatedData = productSchema.parse(body);

    await connectDB();

    const product = new Product({
      ...validatedData,
      createdBy: session.user.id,
    });

    await product.save();

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
