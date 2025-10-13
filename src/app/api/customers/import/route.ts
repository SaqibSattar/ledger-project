import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Customer } from '@/models';
import { customerSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileContent = await file.text();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    let customers: any[] = [];

    if (fileExtension === 'csv') {
      customers = parseCSV(fileContent);
    } else if (fileExtension === 'json') {
      customers = JSON.parse(fileContent);
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Please use CSV or JSON.' }, { status: 400 });
    }

    if (!Array.isArray(customers)) {
      return NextResponse.json({ error: 'File must contain an array of customers' }, { status: 400 });
    }

    const validatedCustomers = [];
    const errors = [];

    for (let i = 0; i < customers.length; i++) {
      try {
        const customerData = {
          ...customers[i],
          createdBy: session.user.id,
        };

        const validatedCustomer = customerSchema.parse(customerData);
        validatedCustomers.push(validatedCustomer);
      } catch (error: any) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Validation errors found', 
        details: errors 
      }, { status: 400 });
    }

    const createdCustomers = await Customer.insertMany(validatedCustomers);

    return NextResponse.json({
      message: 'Customers imported successfully',
      imported: createdCustomers.length,
      total: customers.length,
    });

  } catch (error: any) {
    console.error('Error importing customers:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to import customers' },
      { status: 500 }
    );
  }
}

function parseCSV(csvContent: string): any[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const customers = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const customer: any = {};

    headers.forEach((header, index) => {
      let value = values[index] || '';
      
      // Handle empty values
      if (value === '' || value === 'undefined') {
        value = undefined;
      }

      customer[header] = value;
    });

    customers.push(customer);
  }

  return customers;
}
