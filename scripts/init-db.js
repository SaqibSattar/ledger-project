const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ledger-system';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'accountant'], required: true },
}, {
  timestamps: true,
});

// Customer Schema
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  area: { type: String, required: true },
  role: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  unitPrice: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, min: 0 },
  unit: { type: String, required: true },
  minStockAlert: { type: Number, min: 0 },
  registrationNumber: { type: String },
  registrationValidUpto: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

// Invoice Item Schema
const invoiceItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  nameSnapshot: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

// Invoice Schema
const invoiceSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [invoiceItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, required: true, min: 0, default: 0 },
  dueAmount: { type: Number, required: true, min: 0 },
  invoiceDate: { type: Date, required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

// Create models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

async function initializeDatabase() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@ledger.com',
      password: hashedPassword,
      role: 'admin',
    });
    await adminUser.save();
    console.log('Created admin user');

    // Create accountant user
    const accountantPassword = await bcrypt.hash('accountant123', 12);
    const accountantUser = new User({
      name: 'Accountant User',
      email: 'accountant@ledger.com',
      password: accountantPassword,
      role: 'accountant',
    });
    await accountantUser.save();
    console.log('Created accountant user');

    // Create sample customer based on the invoice image
    const customer = new Customer({
      name: 'MUHAMMAD YAQOOB',
      area: 'PESHAWAR',
      role: 'dealer',
      createdBy: adminUser._id,
    });
    await customer.save();
    console.log('Created sample customer');

    // Create sample products based on the images
    const products = [
      {
        name: 'IMIDACLOPRID 25% WP 25KG',
        description: 'Insecticide powder formulation',
        unitPrice: 1300,
        stockQuantity: 500,
        unit: 'kg',
        minStockAlert: 50,
        registrationNumber: 'REG-001',
        registrationValidUpto: new Date('2026-12-31'),
        createdBy: adminUser._id,
      },
      {
        name: 'FUSE 25% WG 48 GM',
        description: 'Herbicide granular formulation',
        unitPrice: 100,
        stockQuantity: 1000,
        unit: 'gm',
        minStockAlert: 100,
        registrationNumber: 'REG-002',
        registrationValidUpto: new Date('2027-06-30'),
        createdBy: adminUser._id,
      },
      {
        name: 'HITTER 1.9 EC 200-ML (40)',
        description: 'Insecticide emulsifiable concentrate',
        unitPrice: 275,
        stockQuantity: 200,
        unit: 'ml',
        minStockAlert: 20,
        registrationNumber: 'REG-003',
        registrationValidUpto: new Date('2026-09-15'),
        createdBy: adminUser._id,
      },
      {
        name: 'SALOON 2.5% EC 1-LTR(12)',
        description: 'Herbicide emulsifiable concentrate',
        unitPrice: 1025,
        stockQuantity: 150,
        unit: 'ltr',
        minStockAlert: 15,
        registrationNumber: 'REG-004',
        registrationValidUpto: new Date('2027-03-20'),
        createdBy: adminUser._id,
      },
      {
        name: 'HY ULTRA 25%OD 400ML',
        description: 'Ultra concentrated oil dispersion',
        unitPrice: 650,
        stockQuantity: 300,
        unit: 'ml',
        minStockAlert: 30,
        registrationNumber: 'REG-005',
        registrationValidUpto: new Date('2026-11-10'),
        createdBy: adminUser._id,
      },
    ];

    const createdProducts = await Product.insertMany(products);
    console.log('Created sample products');

    // Create sample invoice based on the invoice image
    const invoice = new Invoice({
      customerId: customer._id,
      items: [
        {
          productId: createdProducts[0]._id,
          nameSnapshot: 'IMIDACLOPRID 25% WP 25KG',
          quantity: 125,
          rate: 1300,
          amount: 162500,
        },
      ],
      totalAmount: 162500,
      paidAmount: 0,
      dueAmount: 162500,
      invoiceDate: new Date('2025-10-11'),
      invoiceNumber: '1101006001',
      createdBy: adminUser._id,
    });
    await invoice.save();
    console.log('Created sample invoice');

    // Update stock for the sold product
    await Product.findByIdAndUpdate(
      createdProducts[0]._id,
      { $inc: { stockQuantity: -125 } }
    );
    console.log('Updated product stock');

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📋 Login credentials:');
    console.log('👤 Admin: admin@ledger.com / admin123');
    console.log('👤 Accountant: accountant@ledger.com / accountant123');
    console.log('\n📊 Sample data created:');
    console.log('• 2 users (Admin + Accountant)');
    console.log('• 1 customer (MUHAMMAD YAQOOB - PESHAWAR)');
    console.log('• 5 products (IMIDACLOPRID, FUSE, HITTER, SALOON, HY ULTRA)');
    console.log('• 1 sample invoice (Invoice #1101006001)');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

initializeDatabase();
