import mongoose, { Document, Schema } from 'mongoose';

// User Model
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'accountant';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'accountant'], required: true },
}, {
  timestamps: true,
});

// Customer Model
export interface ICustomer extends Document {
  name: string;
  area: string;
  role: string; // e.g., dealer, vendor
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>({
  name: { type: String, required: true },
  area: { type: String, required: true },
  role: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

// Product Model
export interface IProduct extends Document {
  name: string;
  description?: string;
  unitPrice: number;
  stockQuantity?: number;
  unit: string; // e.g., pcs, kg, liters
  minStockAlert?: number;
  registrationNumber?: string;
  registrationValidUpto?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  description: { type: String },
  unitPrice: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, min: 0 },
  unit: { type: String, required: true },
  minStockAlert: { type: Number, min: 0 },
  registrationNumber: { type: String },
  registrationValidUpto: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

// Invoice Item Interface
export interface IInvoiceItem {
  productId: mongoose.Types.ObjectId;
  nameSnapshot: string; // Store product name at time of invoice
  quantity: number;
  rate: number;
  amount: number;
}

// Invoice Model
export interface IInvoice extends Document {
  customerId: mongoose.Types.ObjectId;
  items: IInvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  invoiceDate: Date;
  invoiceNumber: string; // Auto-generated invoice number
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  nameSnapshot: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const invoiceSchema = new Schema<IInvoice>({
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [invoiceItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, required: true, min: 0, default: 0 },
  dueAmount: { type: Number, required: true, min: 0 },
  invoiceDate: { type: Date, required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

// Payment Model (for tracking payments against invoices)
export interface IPayment extends Document {
  invoiceId: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  amount: { type: Number, required: true, min: 0.01 },
  paymentDate: { type: Date, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

// Ledger Entry Interface (computed from invoices and payments)
export interface ILedgerEntry {
  date: Date;
  description: string;
  invoiceNumber?: string;
  debit: number;
  credit: number;
  balance: number;
}

// Create models
export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export const Customer = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', customerSchema);
export const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);
export const Invoice = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', invoiceSchema);
export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);
