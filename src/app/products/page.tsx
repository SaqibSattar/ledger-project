'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Package, Upload, Download, FileText } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

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
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, showLowStock]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (showLowStock) params.append('lowStock', 'true');
      
      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setProducts(data.products);
      } else {
        console.error('Error fetching products:', data.error);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProducts(products.filter(product => product._id !== id));
      } else {
        const data = await response.json();
        alert('Error deleting product: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  };

  const isLowStock = (product: Product) => {
    if (!product.stockQuantity || !product.minStockAlert) return false;
    return product.stockQuantity <= product.minStockAlert;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`Successfully imported ${data.imported} products!`);
        fetchProducts(); // Refresh the list
        setShowImportModal(false);
      } else {
        alert('Error importing products: ' + data.error);
      }
    } catch (error) {
      console.error('Error importing products:', error);
      alert('Error importing products');
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const csvContent = `name,description,unitPrice,stockQuantity,unit,minStockAlert,registrationNumber,registrationValidUpto
IMIDACLOPRID 25% WP 25KG,Insecticide powder formulation,1300,500,kg,50,REG-001,2026-12-31
FUSE 25% WG 48 GM,Herbicide granular formulation,100,1000,gm,100,REG-002,2027-06-30
HITTER 1.9 EC 200-ML,Insecticide emulsifiable concentrate,275,200,ml,20,REG-003,2026-09-15`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportProducts = async () => {
    try {
      const response = await fetch('/api/products/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting products:', error);
      alert('Error exporting products');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your product inventory</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportProducts}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV/JSON
          </Button>
          <Link href="/products/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find products by name or description</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lowStock"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="lowStock" className="text-sm">
                Show low stock only
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product Inventory</CardTitle>
          <CardDescription>
            {products.length} product{products.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No products found. Create your first product to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500">{product.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(product.unitPrice)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {product.stockQuantity !== undefined ? (
                          <>
                            <span className={isLowStock(product) ? 'text-red-600 font-medium' : ''}>
                              {product.stockQuantity}
                            </span>
                            {isLowStock(product) && (
                              <Package className="h-4 w-4 text-red-500" />
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>
                      {product.registrationNumber ? (
                        <div className="text-sm">
                          <div>{product.registrationNumber}</div>
                          {product.registrationValidUpto && (
                            <div className="text-gray-500">
                              Valid until: {new Date(product.registrationValidUpto).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>{product.createdBy.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/products/${product._id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(product._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Import Products</CardTitle>
              <CardDescription>
                Upload a CSV or JSON file to import multiple products
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select File (CSV or JSON)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">CSV Format:</p>
                <p className="text-xs mb-2">
                  name,description,unitPrice,stockQuantity,unit,minStockAlert,registrationNumber,registrationValidUpto
                </p>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importLoading}
                  className="flex-1"
                >
                  {importLoading ? 'Importing...' : 'Select File'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
