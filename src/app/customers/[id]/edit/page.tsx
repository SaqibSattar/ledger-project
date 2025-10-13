'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { customerSchema, type CustomerFormData } from '@/lib/validations';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Customer {
  _id: string;
  name: string;
  area: string;
  role: string;
}

export default function EditCustomerPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    area: '',
    role: '',
  });
  const [errors, setErrors] = useState<Partial<CustomerFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      const data = await response.json();
      
      if (response.ok) {
        setCustomer(data);
        setFormData({
          name: data.name,
          area: data.area,
          role: data.role,
        });
      } else {
        console.error('Error fetching customer:', data.error);
        router.push('/customers');
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      router.push('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const validatedData = customerSchema.parse(formData);
      
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      if (response.ok) {
        router.push('/customers');
      } else {
        const data = await response.json();
        if (data.details) {
          const fieldErrors: Partial<CustomerFormData> = {};
          data.details.forEach((err: any) => {
            fieldErrors[err.path[0] as keyof CustomerFormData] = err.message;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ name: data.error });
        }
      }
    } catch (error: any) {
      if (error.errors) {
        const fieldErrors: Partial<CustomerFormData> = {};
        error.errors.forEach((err: any) => {
          fieldErrors[err.path[0] as keyof CustomerFormData] = err.message;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof CustomerFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Customer</h1>
            <p className="text-gray-600">Loading customer details...</p>
          </div>
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Not Found</h1>
            <p className="text-gray-600">The customer you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Customer</h1>
          <p className="text-gray-600">Update customer information</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
          <CardDescription>
            Update the customer details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Customer Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'border-red-500' : ''}
                placeholder="Enter customer name"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="area">Area *</Label>
              <Input
                id="area"
                name="area"
                value={formData.area}
                onChange={handleChange}
                className={errors.area ? 'border-red-500' : ''}
                placeholder="Enter area/location"
              />
              {errors.area && (
                <p className="text-sm text-red-500 mt-1">{errors.area}</p>
              )}
            </div>

            <div>
              <Label htmlFor="role">Role *</Label>
              <Input
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={errors.role ? 'border-red-500' : ''}
                placeholder="e.g., dealer, vendor, distributor"
              />
              {errors.role && (
                <p className="text-sm text-red-500 mt-1">{errors.role}</p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Customer'}
              </Button>
              <Link href="/customers">
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
