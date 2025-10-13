import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/models';
import { userSchema } from '@/lib/validations';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await connectDB();
    
    const user = await User.findById(params.id).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
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
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    
    // If password is empty, remove it from validation
    const updateData = { ...body };
    if (!updateData.password || updateData.password.trim() === '') {
      delete updateData.password;
    }

    const validatedData = userSchema.parse(updateData);

    await connectDB();

    // Hash password if provided
    if (validatedData.password) {
      validatedData.password = await bcrypt.hash(validatedData.password, 12);
    }

    const user = await User.findByIdAndUpdate(
      params.id,
      validatedData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: (error as unknown as { errors: unknown }).errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update user' },
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
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findByIdAndDelete(params.id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
