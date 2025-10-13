import { z } from 'zod';

// User schemas
export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'accountant', 'manager']),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Customer schemas
export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  area: z.string().min(1, 'Area is required'),
  role: z.string().min(1, 'Role is required'),
});

// Product schemas
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  stockQuantity: z.number().min(0).optional(),
  unit: z.string().min(1, 'Unit is required'),
  minStockAlert: z.number().min(0).optional(),
  registrationNumber: z.string().optional(),
  registrationValidUpto: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
});

// Invoice item schema
export const invoiceItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  nameSnapshot: z.string().min(1, 'Product name is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  rate: z.number().min(0, 'Rate must be positive'),
  amount: z.number().min(0, 'Amount must be positive'),
});

// Invoice schemas
export const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  totalAmount: z.number().min(0, 'Total amount must be positive'),
  paidAmount: z.number().min(0, 'Paid amount must be non-negative'),
  dueAmount: z.number().min(0, 'Due amount must be non-negative'),
  invoiceDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
});

// Ledger filter schema
export const ledgerFilterSchema = z.object({
  customerId: z.string().optional(),
  area: z.string().optional(),
  createdBy: z.string().optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
});

// Payment schema
export const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amount: z.number().min(0.01, 'Payment amount must be positive'),
  paymentDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
});

export type UserFormData = z.infer<typeof userSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type CustomerFormData = z.infer<typeof customerSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type InvoiceItemFormData = z.infer<typeof invoiceItemSchema>;
export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type LedgerFilterFormData = z.infer<typeof ledgerFilterSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
