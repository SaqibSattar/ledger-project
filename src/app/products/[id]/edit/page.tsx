'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { productSchema, type ProductFormData } from '@/lib/validations';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Product {
  _id: string;
  name: string;
  description?: string;
  unitPrice: number;
  stockQuantity?: number;
  unit: string;
  minStockAlert?: number;
  registrationNumber?: string;
  registrationValidUpto?: string;
}

export default function EditProductPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    unitPrice: 0,
    stockQuantity: 0,
    unit: '',
    minStockAlert: 0,
    registrationNumber: '',
    registrationValidUpto: undefined,
  });
  const [errors, setErrors] = useState<Partial<ProductFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      const data = await response.json();
      
      if (response.ok) {
        setProduct(data);
        setFormData({
          name: data.name,
          description: data.description || '',
          unitPrice: data.unitPrice,
          stockQuantity: data.stockQuantity || 0,
          unit: data.unit,
          minStockAlert: data.minStockAlert || 0,
          registrationNumber: data.registrationNumber || '',
          registrationValidUpto: data.registrationValidUpto ? new Date(data.registrationValidUpto) : undefined,
        });
      } else {
        console.error('Error fetching product:', data.error);
        router.push('/products');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      router.push('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const validatedData = productSchema.parse(formData);
      
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      if (response.ok) {
        router.push('/products');
      } else {
        const data = await response.json();
        if (data.details) {
          const fieldErrors: Partial<ProductFormData> = {};
          data.details.forEach((err: any) => {
            fieldErrors[err.path[0] as keyof ProductFormData] = err.message;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ name: data.error });
        }
      }
    } catch (error: any) {
      if (error.errors) {
        const fieldErrors: Partial<ProductFormData> = {};
        error.errors.forEach((err: any) => {
          fieldErrors[err.path[0] as keyof ProductFormData] = err.message;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;
    
    if (type === 'number') {
      processedValue = value === '' ? undefined : Number(value);
    } else if (type === 'date') {
      processedValue = value ? new Date(value) : undefined;
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    if (errors[name as keyof ProductFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/products">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
            <p className="text-gray-600">Loading product details...</p>
          </div>
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/products">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Not Found</h1>
            <p className="text-gray-600">The product you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-gray-600">Update product information</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>
            Update the product details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'border-red-500' : ''}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                className={errors.description ? 'border-red-500' : ''}
                placeholder="Product description (optional)"
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unitPrice">Unit Price (PKR) *</Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unitPrice || ''}
                  onChange={handleChange}
                  className={errors.unitPrice ? 'border-red-500' : ''}
                  placeholder="0.00"
                />
                {errors.unitPrice && (
                  <p className="text-sm text-red-500 mt-1">{errors.unitPrice}</p>
                )}
              </div>
              <div>
                <Label htmlFor="unit">Unit *</Label>
                <Input
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className={errors.unit ? 'border-red-500' : ''}
                  placeholder="e.g., pcs, kg, ltr"
                />
                {errors.unit && (
                  <p className="text-sm text-red-500 mt-1">{errors.unit}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stockQuantity">Stock Quantity</Label>
                <Input
                  id="stockQuantity"
                  name="stockQuantity"
                  type="number"
                  min="0"
                  value={formData.stockQuantity || ''}
                  onChange={handleChange}
                  className={errors.stockQuantity ? 'border-red-500' : ''}
                  placeholder="0"
                />
                {errors.stockQuantity && (
                  <p className="text-sm text-red-500 mt-1">{errors.stockQuantity}</p>
                )}
              </div>
              <div>
                <Label htmlFor="minStockAlert">Min Stock Alert</Label>
                <Input
                  id="minStockAlert"
                  name="minStockAlert"
                  type="number"
                  min="0"
                  value={formData.minStockAlert || ''}
                  onChange={handleChange}
                  className={errors.minStockAlert ? 'border-red-500' : ''}
                  placeholder="0"
                />
                {errors.minStockAlert && (
                  <p className="text-sm text-red-500 mt-1">{errors.minStockAlert}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input
                  id="registrationNumber"
                  name="registrationNumber"
                  value={formData.registrationNumber || ''}
                  onChange={handleChange}
                  className={errors.registrationNumber ? 'border-red-500' : ''}
                  placeholder="Registration number (optional)"
                />
                {errors.registrationNumber && (
                  <p className="text-sm text-red-500 mt-1">{errors.registrationNumber}</p>
                )}
              </div>
              <div>
                <Label htmlFor="registrationValidUpto">Registration Valid Until</Label>
                <Input
                  id="registrationValidUpto"
                  name="registrationValidUpto"
                  type="date"
                  value={formData.registrationValidUpto ? formData.registrationValidUpto.toISOString().split('T')[0] : ''}
                  onChange={handleChange}
                  className={errors.registrationValidUpto ? 'border-red-500' : ''}
                />
                {errors.registrationValidUpto && (
                  <p className="text-sm text-red-500 mt-1">{errors.registrationValidUpto}</p>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Product'}
              </Button>
              <Link href="/products">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
