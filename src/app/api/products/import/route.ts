import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { Product } from '@/models';
import { productSchema } from '@/lib/validations';

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
    
    let products: any[] = [];

    if (fileExtension === 'csv') {
      products = parseCSV(fileContent);
    } else if (fileExtension === 'json') {
      products = JSON.parse(fileContent);
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Please use CSV or JSON.' }, { status: 400 });
    }

    if (!Array.isArray(products)) {
      return NextResponse.json({ error: 'File must contain an array of products' }, { status: 400 });
    }

    const validatedProducts = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      try {
        const productData = {
          ...products[i],
          createdBy: session.user.id,
        };

        // Convert string dates to Date objects
        if (productData.registrationValidUpto && typeof productData.registrationValidUpto === 'string') {
          productData.registrationValidUpto = new Date(productData.registrationValidUpto);
        }

        const validatedProduct = productSchema.parse(productData);
        validatedProducts.push(validatedProduct);
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

    const createdProducts = await Product.insertMany(validatedProducts);

    return NextResponse.json({
      message: 'Products imported successfully',
      imported: createdProducts.length,
      total: products.length,
    });

  } catch (error: any) {
    console.error('Error importing products:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to import products' },
      { status: 500 }
    );
  }
}

function parseCSV(csvContent: string): any[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const products = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const product: any = {};

    headers.forEach((header, index) => {
      let value = values[index] || '';
      
      // Convert numeric fields
      if (['unitPrice', 'stockQuantity', 'minStockAlert'].includes(header)) {
        value = value ? parseFloat(value) : undefined;
      }
      
      // Convert boolean or handle empty values
      if (value === '' || value === 'undefined') {
        value = undefined;
      }

      product[header] = value;
    });

    products.push(product);
  }

  return products;
}
